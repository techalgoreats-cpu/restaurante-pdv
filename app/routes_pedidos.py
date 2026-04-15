"""
Rotas de pedidos: criação, listagem, cálculo de combo, impressão.

Lógica de combo v2:
- Combo = preço do prato + valor_adicional da regra (ex: +R$ 10,90)
- O valor_adicional já inclui bebida combo + sobremesa combo
- Se o cliente escolher bebida/sobremesa que NÃO participa do combo, cobra avulso
"""
from flask import Blueprint, request, jsonify
from app.database import query_db, execute_db, get_db, proximo_numero_pedido
from printer.impressora import imprimir_caixa, imprimir_cozinha

bp = Blueprint('pedidos', __name__)


def _calcular_item(item_data):
    """Calcula o subtotal de um item do pedido, aplicando combo se elegível."""
    produto = query_db(
        "SELECT p.*, c.preco_bebida_especial FROM produtos p JOIN categorias c ON p.categoria_id=c.id WHERE p.id=?",
        [item_data['produto_id']], one=True)
    if not produto:
        return None

    combo_aplicado = False
    valor_combo = 0
    bebida_preco = 0
    sobremesa_preco = 0
    extras_preco = 0
    bebida_nome = ''
    sobremesa_nome = ''
    acompanhamentos_txt = ''
    extras_txt = ''
    bebida_especial = False

    # Preço especial de bebida da categoria (ex: R$ 3,00)
    preco_bebida_especial = produto.get('preco_bebida_especial', 0) or 0

    # Buscar acompanhamentos (agora pode ser múltiplos)
    acomp_ids = item_data.get('acompanhamento_ids', [])
    if acomp_ids:
        nomes = []
        for aid in acomp_ids:
            acomp = query_db("SELECT nome FROM acompanhamentos WHERE id=?", [aid], one=True)
            if acomp:
                nomes.append(acomp['nome'])
        acompanhamentos_txt = ', '.join(nomes)

    # Buscar bebida
    bebida = None
    if item_data.get('bebida_id'):
        bebida = query_db("SELECT * FROM bebidas WHERE id=?", [item_data['bebida_id']], one=True)
        if bebida:
            bebida_nome = bebida['nome']
            # Se a categoria tem preço especial de bebida e a bebida participa do combo, usa o preço especial
            if preco_bebida_especial > 0 and bebida.get('participa_especial'):
                bebida_preco = preco_bebida_especial
                bebida_especial = True
            else:
                bebida_preco = bebida['preco']

    # Buscar sobremesa
    sobremesa = None
    if item_data.get('sobremesa_id'):
        sobremesa = query_db("SELECT * FROM sobremesas WHERE id=?", [item_data['sobremesa_id']], one=True)
        if sobremesa:
            sobremesa_nome = sobremesa['nome']
            sobremesa_preco = sobremesa['preco']

    # Buscar extras
    extra_ids = item_data.get('extra_ids', [])
    if extra_ids:
        nomes_extras = []
        for eid in extra_ids:
            extra = query_db("SELECT * FROM extras WHERE id=?", [eid], one=True)
            if extra:
                nomes_extras.append(extra['nome'])
                extras_preco += extra['preco']
        extras_txt = ', '.join(nomes_extras)

    # Verificar regra de combo
    regra = query_db(
        "SELECT rc.* FROM regras_combo rc JOIN produto_regra_combo prc ON rc.id=prc.regra_combo_id WHERE prc.produto_id=? AND rc.ativo=1",
        [produto['id']], one=True
    )

    if regra and produto['tem_combo']:
        pode_combo = True

        if regra['exige_bebida']:
            if not bebida or not bebida.get('participa_combo'):
                pode_combo = False

        if regra['exige_sobremesa']:
            if not sobremesa or not sobremesa.get('participa_combo'):
                pode_combo = False

        if pode_combo:
            combo_aplicado = True
            valor_combo = regra['valor_adicional']
            # No combo, bebida e sobremesa já estão incluídas no valor_adicional
            bebida_preco = 0
            sobremesa_preco = 0

    # Calcular subtotal
    if combo_aplicado:
        subtotal = produto['preco'] + valor_combo + extras_preco
    else:
        subtotal = produto['preco'] + bebida_preco + sobremesa_preco + extras_preco

    return {
        'produto_id': produto['id'],
        'produto_nome': produto['nome'],
        'produto_preco': produto['preco'],
        'acompanhamentos_txt': acompanhamentos_txt,
        'bebida_id': item_data.get('bebida_id'),
        'bebida_nome': bebida_nome,
        'bebida_preco': round(bebida_preco, 2),
        'bebida_especial': 1 if bebida_especial else 0,
        'sobremesa_id': item_data.get('sobremesa_id'),
        'sobremesa_nome': sobremesa_nome,
        'sobremesa_preco': sobremesa_preco,
        'extras_txt': extras_txt,
        'extras_preco': round(extras_preco, 2),
        'combo_aplicado': 1 if combo_aplicado else 0,
        'valor_combo': round(valor_combo, 2),
        'preco_combo_total': round(produto['preco'] + valor_combo, 2) if combo_aplicado else 0,
        'subtotal': round(subtotal, 2),
        'observacao': item_data.get('observacao', '')
    }


@bp.route('/api/pedidos/calcular-item', methods=['POST'])
def calcular_item():
    """Calcula o preço de um item (preview antes de adicionar ao pedido)."""
    data = request.json
    resultado = _calcular_item(data)
    if not resultado:
        return jsonify({'erro': 'Produto não encontrado'}), 404
    return jsonify(resultado)


@bp.route('/api/pedidos', methods=['POST'])
def criar_pedido():
    """Cria um novo pedido completo."""
    data = request.json
    itens_data = data.get('itens', [])
    observacao = data.get('observacao', '')
    pager = data.get('pager', 0)

    if not itens_data:
        return jsonify({'erro': 'Pedido sem itens'}), 400

    itens_calculados = []
    for item_data in itens_data:
        resultado = _calcular_item(item_data)
        if resultado:
            itens_calculados.append(resultado)

    if not itens_calculados:
        return jsonify({'erro': 'Nenhum item válido'}), 400

    subtotal = sum(item['subtotal'] for item in itens_calculados)
    total = subtotal
    numero = proximo_numero_pedido()

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO pedidos (numero, pager, subtotal, desconto, total, observacao, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [numero, pager, round(subtotal, 2), 0, round(total, 2), observacao, 'finalizado']
        )
        pedido_id = cur.lastrowid

        for item in itens_calculados:
            conn.execute(
                """INSERT INTO pedido_itens
                   (pedido_id, produto_id, produto_nome, produto_preco,
                    acompanhamentos_txt, bebida_id, bebida_nome, bebida_preco,
                    sobremesa_id, sobremesa_nome, sobremesa_preco,
                    extras_txt, extras_preco,
                    combo_aplicado, valor_combo, subtotal, observacao)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [pedido_id, item['produto_id'], item['produto_nome'], item['produto_preco'],
                 item['acompanhamentos_txt'], item['bebida_id'], item['bebida_nome'], item['bebida_preco'],
                 item['sobremesa_id'], item['sobremesa_nome'], item['sobremesa_preco'],
                 item['extras_txt'], item['extras_preco'],
                 item['combo_aplicado'], item['valor_combo'], item['subtotal'], item['observacao']]
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'erro': f'Erro ao salvar pedido: {str(e)}'}), 500
    finally:
        conn.close()

    pedido = query_db("SELECT * FROM pedidos WHERE id=?", [pedido_id], one=True)
    itens = query_db("SELECT * FROM pedido_itens WHERE pedido_id=?", [pedido_id])
    resultado_impressao = _imprimir_pedido(pedido, itens)

    return jsonify({
        'pedido': pedido, 'itens': itens,
        'impressao': resultado_impressao,
        'mensagem': f'Pedido #{numero:03d} criado com sucesso'
    }), 201


@bp.route('/api/pedidos', methods=['GET'])
def listar_pedidos():
    data = request.args.get('data')
    if not data:
        from datetime import date
        data = date.today().isoformat()
    return jsonify(query_db("SELECT * FROM pedidos WHERE date(data_hora)=? ORDER BY numero DESC", [data]))


@bp.route('/api/pedidos/<int:id>', methods=['GET'])
def obter_pedido(id):
    pedido = query_db("SELECT * FROM pedidos WHERE id=?", [id], one=True)
    if not pedido:
        return jsonify({'erro': 'Pedido não encontrado'}), 404
    itens = query_db("SELECT * FROM pedido_itens WHERE pedido_id=?", [id])
    return jsonify({'pedido': pedido, 'itens': itens})


@bp.route('/api/pedidos/<int:id>/reimprimir', methods=['POST'])
def reimprimir_pedido(id):
    pedido = query_db("SELECT * FROM pedidos WHERE id=?", [id], one=True)
    if not pedido:
        return jsonify({'erro': 'Pedido não encontrado'}), 404
    itens = query_db("SELECT * FROM pedido_itens WHERE pedido_id=?", [id])
    destino = request.json.get('destino', 'ambos') if request.json else 'ambos'
    resultado = _imprimir_pedido(pedido, itens, destino=destino)
    return jsonify({'mensagem': f'Reimpressão do pedido #{pedido["numero"]:03d}', 'impressao': resultado})


@bp.route('/api/pedidos/proximo-numero', methods=['GET'])
def obter_proximo_numero():
    return jsonify({'numero': proximo_numero_pedido()})


def _imprimir_pedido(pedido, itens, destino='ambos'):
    config = query_db("SELECT valor FROM configuracoes WHERE chave='modo_simulacao_impressora'", one=True)
    simulacao = config and config['valor'] == '1'

    nome_rest = query_db("SELECT valor FROM configuracoes WHERE chave='nome_restaurante'", one=True)
    pedido_dict = dict(pedido) if not isinstance(pedido, dict) else pedido
    pedido_dict['nome_restaurante'] = nome_rest['valor'] if nome_rest else 'RESTAURANTE'

    resultado = {'caixa': None, 'cozinha': None}

    if destino in ('ambos', 'caixa'):
        cfg = query_db("SELECT * FROM impressoras WHERE tipo='caixa' AND ativo=1", one=True)
        resultado['caixa'] = imprimir_caixa(pedido_dict, itens, config_impressora=dict(cfg) if cfg else None, simulacao=simulacao)
        if resultado['caixa'].get('sucesso'):
            execute_db("UPDATE pedidos SET impresso_caixa=1 WHERE id=?", [pedido_dict['id']])

    if destino in ('ambos', 'cozinha'):
        cfg = query_db("SELECT * FROM impressoras WHERE tipo='cozinha' AND ativo=1", one=True)
        resultado['cozinha'] = imprimir_cozinha(pedido_dict, itens, config_impressora=dict(cfg) if cfg else None, simulacao=simulacao)
        if resultado['cozinha'].get('sucesso'):
            execute_db("UPDATE pedidos SET impresso_cozinha=1 WHERE id=?", [pedido_dict['id']])

    return resultado
