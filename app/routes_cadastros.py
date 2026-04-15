"""
Rotas de cadastro com proteção por senha admin e log de alterações.
"""
from flask import Blueprint, request, jsonify
from app.database import query_db, execute_db

bp = Blueprint('cadastros', __name__)


def _verificar_senha():
    senha_enviada = request.headers.get('X-Admin-Senha', '')
    config = query_db("SELECT valor FROM configuracoes WHERE chave='admin_senha'", one=True)
    senha_correta = config['valor'] if config else 'al2420'
    if senha_enviada != senha_correta:
        return jsonify({'erro': 'Acesso negado'}), 403
    return None


def _log(acao, entidade, entidade_id=None, detalhe=''):
    execute_db(
        "INSERT INTO logs (acao, entidade, entidade_id, detalhe) VALUES (?, ?, ?, ?)",
        [acao, entidade, entidade_id, detalhe]
    )


# ============================================
# LOGS E AUTH
# ============================================

@bp.route('/api/logs', methods=['GET'])
def listar_logs():
    limite = request.args.get('limite', 100)
    return jsonify(query_db("SELECT * FROM logs ORDER BY data_hora DESC LIMIT ?", [limite]))


@bp.route('/api/admin/login', methods=['POST'])
def login_admin():
    data = request.json
    user_enviado = data.get('usuario', '')
    senha_enviada = data.get('senha', '')
    cfg_user = query_db("SELECT valor FROM configuracoes WHERE chave='admin_user'", one=True)
    cfg_senha = query_db("SELECT valor FROM configuracoes WHERE chave='admin_senha'", one=True)
    user_correto = cfg_user['valor'] if cfg_user else 'admin'
    senha_correta = cfg_senha['valor'] if cfg_senha else 'al2420'
    if user_enviado == user_correto and senha_enviada == senha_correta:
        return jsonify({'ok': True})
    return jsonify({'ok': False, 'erro': 'Usuario ou senha incorretos'}), 403


# ============================================
# CATEGORIAS
# ============================================

@bp.route('/api/categorias', methods=['GET'])
def listar_categorias():
    categorias = query_db("SELECT * FROM categorias WHERE ativo=1 ORDER BY ordem, nome")
    for c in categorias:
        c['extras'] = query_db(
            "SELECT e.* FROM extras e JOIN categoria_extra ce ON e.id=ce.extra_id WHERE ce.categoria_id=? AND e.ativo=1", [c['id']])
    return jsonify(categorias)


@bp.route('/api/categorias', methods=['POST'])
def criar_categoria():
    err = _verificar_senha()
    if err: return err
    data = request.json
    cat_id = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo, preco_bebida_especial) VALUES (?, ?, ?, ?, ?, ?)",
        [data['nome'], data.get('ordem', 0), data.get('qtd_acompanhamentos', 0),
         data.get('acompanhamento_label', 'Escolha o acompanhamento'), data.get('acompanhamento_fixo', ''),
         data.get('preco_bebida_especial', 0)])
    if data.get('extra_ids'):
        for eid in data['extra_ids']:
            execute_db("INSERT OR IGNORE INTO categoria_extra (categoria_id, extra_id) VALUES (?, ?)", [cat_id, eid])
    _log('criou', 'categoria', cat_id, data['nome'])
    return jsonify({'id': cat_id, 'mensagem': 'Categoria criada'}), 201


@bp.route('/api/categorias/<int:id>', methods=['PUT'])
def atualizar_categoria(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    execute_db(
        "UPDATE categorias SET nome=?, ordem=?, qtd_acompanhamentos=?, acompanhamento_label=?, acompanhamento_fixo=?, preco_bebida_especial=?, ativo=?, atualizado_em=datetime('now','localtime') WHERE id=?",
        [data['nome'], data.get('ordem', 0), data.get('qtd_acompanhamentos', 0),
         data.get('acompanhamento_label', 'Escolha o acompanhamento'), data.get('acompanhamento_fixo', ''),
         data.get('preco_bebida_especial', 0), data.get('ativo', 1), id])
    execute_db("DELETE FROM categoria_extra WHERE categoria_id=?", [id])
    if data.get('extra_ids'):
        for eid in data['extra_ids']:
            execute_db("INSERT OR IGNORE INTO categoria_extra (categoria_id, extra_id) VALUES (?, ?)", [id, eid])
    _log('editou', 'categoria', id, data['nome'])
    return jsonify({'mensagem': 'Categoria atualizada'})


@bp.route('/api/categorias/<int:id>', methods=['DELETE'])
def excluir_categoria(id):
    err = _verificar_senha()
    if err: return err
    cat = query_db("SELECT nome FROM categorias WHERE id=?", [id], one=True)
    execute_db("UPDATE categorias SET ativo=0, atualizado_em=datetime('now','localtime') WHERE id=?", [id])
    _log('desativou', 'categoria', id, cat['nome'] if cat else '')
    return jsonify({'mensagem': 'Categoria desativada'})


# ============================================
# PRODUTOS
# ============================================

@bp.route('/api/produtos', methods=['GET'])
def listar_produtos():
    categoria_id = request.args.get('categoria_id')
    if categoria_id:
        produtos = query_db(
            """SELECT p.*, c.nome as categoria_nome, c.qtd_acompanhamentos, c.acompanhamento_label, c.acompanhamento_fixo
               FROM produtos p JOIN categorias c ON p.categoria_id=c.id WHERE p.ativo=1 AND p.categoria_id=? ORDER BY p.ordem, p.nome""", [categoria_id])
    else:
        produtos = query_db(
            """SELECT p.*, c.nome as categoria_nome, c.qtd_acompanhamentos, c.acompanhamento_label, c.acompanhamento_fixo
               FROM produtos p JOIN categorias c ON p.categoria_id=c.id WHERE p.ativo=1 ORDER BY c.ordem, p.ordem, p.nome""")
    for p in produtos:
        p['acompanhamentos'] = query_db(
            "SELECT a.* FROM acompanhamentos a JOIN produto_acompanhamento pa ON a.id=pa.acompanhamento_id WHERE pa.produto_id=? AND a.ativo=1", [p['id']])
        p['regra_combo'] = query_db(
            "SELECT rc.* FROM regras_combo rc JOIN produto_regra_combo prc ON rc.id=prc.regra_combo_id WHERE prc.produto_id=? AND rc.ativo=1", [p['id']], one=True)
        p['extras'] = query_db(
            "SELECT e.* FROM extras e JOIN categoria_extra ce ON e.id=ce.extra_id WHERE ce.categoria_id=? AND e.ativo=1", [p['categoria_id']])
    return jsonify(produtos)


@bp.route('/api/produtos/<int:id>', methods=['GET'])
def obter_produto(id):
    produto = query_db(
        """SELECT p.*, c.nome as categoria_nome, c.qtd_acompanhamentos, c.acompanhamento_label, c.acompanhamento_fixo
           FROM produtos p JOIN categorias c ON p.categoria_id=c.id WHERE p.id=?""", [id], one=True)
    if not produto: return jsonify({'erro': 'Produto não encontrado'}), 404
    produto['acompanhamentos'] = query_db(
        "SELECT a.* FROM acompanhamentos a JOIN produto_acompanhamento pa ON a.id=pa.acompanhamento_id WHERE pa.produto_id=? AND a.ativo=1", [id])
    produto['regra_combo'] = query_db(
        "SELECT rc.* FROM regras_combo rc JOIN produto_regra_combo prc ON rc.id=prc.regra_combo_id WHERE prc.produto_id=? AND rc.ativo=1", [id], one=True)
    produto['extras'] = query_db(
        "SELECT e.* FROM extras e JOIN categoria_extra ce ON e.id=ce.extra_id WHERE ce.categoria_id=? AND e.ativo=1", [produto['categoria_id']])
    return jsonify(produto)


@bp.route('/api/produtos', methods=['POST'])
def criar_produto():
    err = _verificar_senha()
    if err: return err
    data = request.json
    prod_id = execute_db(
        "INSERT INTO produtos (categoria_id, nome, descricao, preco, tem_combo, ordem) VALUES (?, ?, ?, ?, ?, ?)",
        [data['categoria_id'], data['nome'], data.get('descricao', ''), data['preco'], data.get('tem_combo', 1), data.get('ordem', 0)])
    if data.get('acompanhamento_ids'):
        for aid in data['acompanhamento_ids']:
            execute_db("INSERT OR IGNORE INTO produto_acompanhamento (produto_id, acompanhamento_id) VALUES (?, ?)", [prod_id, aid])
    if data.get('regra_combo_id'):
        execute_db("INSERT OR IGNORE INTO produto_regra_combo (produto_id, regra_combo_id) VALUES (?, ?)", [prod_id, data['regra_combo_id']])
    _log('criou', 'produto', prod_id, f"{data['nome']} R${data['preco']:.2f}")
    return jsonify({'id': prod_id, 'mensagem': 'Produto criado'}), 201


@bp.route('/api/produtos/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    antigo = query_db("SELECT nome, preco FROM produtos WHERE id=?", [id], one=True)
    execute_db(
        "UPDATE produtos SET categoria_id=?, nome=?, descricao=?, preco=?, tem_combo=?, ordem=?, ativo=?, atualizado_em=datetime('now','localtime') WHERE id=?",
        [data['categoria_id'], data['nome'], data.get('descricao', ''), data['preco'], data.get('tem_combo', 1), data.get('ordem', 0), data.get('ativo', 1), id])
    execute_db("DELETE FROM produto_acompanhamento WHERE produto_id=?", [id])
    if data.get('acompanhamento_ids'):
        for aid in data['acompanhamento_ids']:
            execute_db("INSERT OR IGNORE INTO produto_acompanhamento (produto_id, acompanhamento_id) VALUES (?, ?)", [id, aid])
    execute_db("DELETE FROM produto_regra_combo WHERE produto_id=?", [id])
    if data.get('regra_combo_id'):
        execute_db("INSERT OR IGNORE INTO produto_regra_combo (produto_id, regra_combo_id) VALUES (?, ?)", [id, data['regra_combo_id']])
    detalhe = f"{data['nome']} R${data['preco']:.2f}"
    if antigo and antigo['preco'] != data['preco']:
        detalhe += f" (antes: R${antigo['preco']:.2f})"
    _log('editou', 'produto', id, detalhe)
    return jsonify({'mensagem': 'Produto atualizado'})


@bp.route('/api/produtos/<int:id>', methods=['DELETE'])
def excluir_produto(id):
    err = _verificar_senha()
    if err: return err
    prod = query_db("SELECT nome FROM produtos WHERE id=?", [id], one=True)
    execute_db("UPDATE produtos SET ativo=0, atualizado_em=datetime('now','localtime') WHERE id=?", [id])
    _log('desativou', 'produto', id, prod['nome'] if prod else '')
    return jsonify({'mensagem': 'Produto desativado'})


# ============================================
# ACOMPANHAMENTOS
# ============================================

@bp.route('/api/acompanhamentos', methods=['GET'])
def listar_acompanhamentos():
    return jsonify(query_db("SELECT * FROM acompanhamentos WHERE ativo=1 ORDER BY nome"))

@bp.route('/api/acompanhamentos', methods=['POST'])
def criar_acompanhamento():
    err = _verificar_senha()
    if err: return err
    data = request.json
    aid = execute_db("INSERT INTO acompanhamentos (nome) VALUES (?)", [data['nome']])
    _log('criou', 'acompanhamento', aid, data['nome'])
    return jsonify({'id': aid, 'mensagem': 'Acompanhamento criado'}), 201

@bp.route('/api/acompanhamentos/<int:id>', methods=['PUT'])
def atualizar_acompanhamento(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    execute_db("UPDATE acompanhamentos SET nome=?, ativo=? WHERE id=?", [data['nome'], data.get('ativo', 1), id])
    _log('editou', 'acompanhamento', id, data['nome'])
    return jsonify({'mensagem': 'Acompanhamento atualizado'})

@bp.route('/api/acompanhamentos/<int:id>', methods=['DELETE'])
def excluir_acompanhamento(id):
    err = _verificar_senha()
    if err: return err
    a = query_db("SELECT nome FROM acompanhamentos WHERE id=?", [id], one=True)
    execute_db("UPDATE acompanhamentos SET ativo=0 WHERE id=?", [id])
    _log('desativou', 'acompanhamento', id, a['nome'] if a else '')
    return jsonify({'mensagem': 'Acompanhamento desativado'})


# ============================================
# BEBIDAS
# ============================================

@bp.route('/api/bebidas', methods=['GET'])
def listar_bebidas():
    combo = request.args.get('combo')
    if combo == '1':
        return jsonify(query_db("SELECT * FROM bebidas WHERE ativo=1 AND participa_combo=1 ORDER BY ordem, nome"))
    return jsonify(query_db("SELECT * FROM bebidas WHERE ativo=1 ORDER BY ordem, nome"))

@bp.route('/api/bebidas', methods=['POST'])
def criar_bebida():
    err = _verificar_senha()
    if err: return err
    data = request.json
    bid = execute_db("INSERT INTO bebidas (nome, preco, participa_combo, participa_especial, ordem) VALUES (?, ?, ?, ?, ?)",
                     [data['nome'], data['preco'], data.get('participa_combo', 0), data.get('participa_especial', 0), data.get('ordem', 0)])
    _log('criou', 'bebida', bid, f"{data['nome']} R${data['preco']:.2f}")
    return jsonify({'id': bid, 'mensagem': 'Bebida criada'}), 201

@bp.route('/api/bebidas/<int:id>', methods=['PUT'])
def atualizar_bebida(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    antigo = query_db("SELECT nome, preco FROM bebidas WHERE id=?", [id], one=True)
    execute_db("UPDATE bebidas SET nome=?, preco=?, participa_combo=?, participa_especial=?, ordem=?, ativo=? WHERE id=?",
               [data['nome'], data['preco'], data.get('participa_combo', 0), data.get('participa_especial', 0), data.get('ordem', 0), data.get('ativo', 1), id])
    detalhe = f"{data['nome']} R${data['preco']:.2f}"
    if antigo and antigo['preco'] != data['preco']:
        detalhe += f" (antes: R${antigo['preco']:.2f})"
    _log('editou', 'bebida', id, detalhe)
    return jsonify({'mensagem': 'Bebida atualizada'})

@bp.route('/api/bebidas/<int:id>', methods=['DELETE'])
def excluir_bebida(id):
    err = _verificar_senha()
    if err: return err
    b = query_db("SELECT nome FROM bebidas WHERE id=?", [id], one=True)
    execute_db("UPDATE bebidas SET ativo=0 WHERE id=?", [id])
    _log('desativou', 'bebida', id, b['nome'] if b else '')
    return jsonify({'mensagem': 'Bebida desativada'})


# ============================================
# SOBREMESAS
# ============================================

@bp.route('/api/sobremesas', methods=['GET'])
def listar_sobremesas():
    combo = request.args.get('combo')
    if combo == '1':
        return jsonify(query_db("SELECT * FROM sobremesas WHERE ativo=1 AND participa_combo=1 ORDER BY ordem, nome"))
    return jsonify(query_db("SELECT * FROM sobremesas WHERE ativo=1 ORDER BY ordem, nome"))

@bp.route('/api/sobremesas', methods=['POST'])
def criar_sobremesa():
    err = _verificar_senha()
    if err: return err
    data = request.json
    sid = execute_db("INSERT INTO sobremesas (nome, preco, participa_combo, ordem) VALUES (?, ?, ?, ?)",
                     [data['nome'], data['preco'], data.get('participa_combo', 0), data.get('ordem', 0)])
    _log('criou', 'sobremesa', sid, f"{data['nome']} R${data['preco']:.2f}")
    return jsonify({'id': sid, 'mensagem': 'Sobremesa criada'}), 201

@bp.route('/api/sobremesas/<int:id>', methods=['PUT'])
def atualizar_sobremesa(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    antigo = query_db("SELECT nome, preco FROM sobremesas WHERE id=?", [id], one=True)
    execute_db("UPDATE sobremesas SET nome=?, preco=?, participa_combo=?, ordem=?, ativo=? WHERE id=?",
               [data['nome'], data['preco'], data.get('participa_combo', 0), data.get('ordem', 0), data.get('ativo', 1), id])
    detalhe = f"{data['nome']} R${data['preco']:.2f}"
    if antigo and antigo['preco'] != data['preco']:
        detalhe += f" (antes: R${antigo['preco']:.2f})"
    _log('editou', 'sobremesa', id, detalhe)
    return jsonify({'mensagem': 'Sobremesa atualizada'})

@bp.route('/api/sobremesas/<int:id>', methods=['DELETE'])
def excluir_sobremesa(id):
    err = _verificar_senha()
    if err: return err
    s = query_db("SELECT nome FROM sobremesas WHERE id=?", [id], one=True)
    execute_db("UPDATE sobremesas SET ativo=0 WHERE id=?", [id])
    _log('desativou', 'sobremesa', id, s['nome'] if s else '')
    return jsonify({'mensagem': 'Sobremesa desativada'})


# ============================================
# EXTRAS
# ============================================

@bp.route('/api/extras', methods=['GET'])
def listar_extras():
    return jsonify(query_db("SELECT * FROM extras WHERE ativo=1 ORDER BY ordem, nome"))

@bp.route('/api/extras', methods=['POST'])
def criar_extra():
    err = _verificar_senha()
    if err: return err
    data = request.json
    eid = execute_db("INSERT INTO extras (nome, preco, ordem) VALUES (?, ?, ?)",
                     [data['nome'], data['preco'], data.get('ordem', 0)])
    _log('criou', 'extra', eid, f"{data['nome']} R${data['preco']:.2f}")
    return jsonify({'id': eid, 'mensagem': 'Extra criado'}), 201

@bp.route('/api/extras/<int:id>', methods=['PUT'])
def atualizar_extra(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    execute_db("UPDATE extras SET nome=?, preco=?, ordem=?, ativo=? WHERE id=?",
               [data['nome'], data['preco'], data.get('ordem', 0), data.get('ativo', 1), id])
    _log('editou', 'extra', id, f"{data['nome']} R${data['preco']:.2f}")
    return jsonify({'mensagem': 'Extra atualizado'})

@bp.route('/api/extras/<int:id>', methods=['DELETE'])
def excluir_extra(id):
    err = _verificar_senha()
    if err: return err
    e = query_db("SELECT nome FROM extras WHERE id=?", [id], one=True)
    execute_db("UPDATE extras SET ativo=0 WHERE id=?", [id])
    _log('desativou', 'extra', id, e['nome'] if e else '')
    return jsonify({'mensagem': 'Extra desativado'})


# ============================================
# REGRAS DE COMBO
# ============================================

@bp.route('/api/regras-combo', methods=['GET'])
def listar_regras_combo():
    regras = query_db("SELECT * FROM regras_combo WHERE ativo=1 ORDER BY nome")
    for r in regras:
        r['produtos'] = query_db(
            "SELECT p.id, p.nome FROM produtos p JOIN produto_regra_combo prc ON p.id=prc.produto_id WHERE prc.regra_combo_id=?", [r['id']])
    return jsonify(regras)

@bp.route('/api/regras-combo', methods=['POST'])
def criar_regra_combo():
    err = _verificar_senha()
    if err: return err
    data = request.json
    rid = execute_db(
        "INSERT INTO regras_combo (nome, descricao, valor_adicional, exige_bebida, exige_sobremesa) VALUES (?, ?, ?, ?, ?)",
        [data['nome'], data.get('descricao', ''), data.get('valor_adicional', 10.90), data.get('exige_bebida', 1), data.get('exige_sobremesa', 1)])
    if data.get('produto_ids'):
        for pid in data['produto_ids']:
            execute_db("INSERT OR IGNORE INTO produto_regra_combo (produto_id, regra_combo_id) VALUES (?, ?)", [pid, rid])
    _log('criou', 'regra_combo', rid, f"{data['nome']} +R${data.get('valor_adicional', 10.90):.2f}")
    return jsonify({'id': rid, 'mensagem': 'Regra de combo criada'}), 201

@bp.route('/api/regras-combo/<int:id>', methods=['PUT'])
def atualizar_regra_combo(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    execute_db(
        "UPDATE regras_combo SET nome=?, descricao=?, valor_adicional=?, exige_bebida=?, exige_sobremesa=?, ativo=? WHERE id=?",
        [data['nome'], data.get('descricao', ''), data.get('valor_adicional', 10.90), data.get('exige_bebida', 1), data.get('exige_sobremesa', 1), data.get('ativo', 1), id])
    execute_db("DELETE FROM produto_regra_combo WHERE regra_combo_id=?", [id])
    if data.get('produto_ids'):
        for pid in data['produto_ids']:
            execute_db("INSERT OR IGNORE INTO produto_regra_combo (produto_id, regra_combo_id) VALUES (?, ?)", [pid, id])
    _log('editou', 'regra_combo', id, f"{data['nome']} +R${data.get('valor_adicional', 10.90):.2f}")
    return jsonify({'mensagem': 'Regra de combo atualizada'})

@bp.route('/api/regras-combo/<int:id>', methods=['DELETE'])
def excluir_regra_combo(id):
    err = _verificar_senha()
    if err: return err
    r = query_db("SELECT nome FROM regras_combo WHERE id=?", [id], one=True)
    execute_db("UPDATE regras_combo SET ativo=0 WHERE id=?", [id])
    _log('desativou', 'regra_combo', id, r['nome'] if r else '')
    return jsonify({'mensagem': 'Regra de combo desativada'})


# ============================================
# IMPRESSORAS
# ============================================

@bp.route('/api/impressoras', methods=['GET'])
def listar_impressoras():
    return jsonify(query_db("SELECT * FROM impressoras ORDER BY tipo, nome"))

@bp.route('/api/impressoras', methods=['POST'])
def criar_impressora():
    err = _verificar_senha()
    if err: return err
    data = request.json
    iid = execute_db(
        "INSERT INTO impressoras (nome, tipo, conexao, endereco, porta, vendor_id, product_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [data['nome'], data['tipo'], data['conexao'], data.get('endereco', ''), data.get('porta', 9100), data.get('vendor_id', ''), data.get('product_id', '')])
    _log('criou', 'impressora', iid, f"{data['nome']} ({data['tipo']})")
    return jsonify({'id': iid, 'mensagem': 'Impressora cadastrada'}), 201

@bp.route('/api/impressoras/<int:id>', methods=['PUT'])
def atualizar_impressora(id):
    err = _verificar_senha()
    if err: return err
    data = request.json
    execute_db(
        "UPDATE impressoras SET nome=?, tipo=?, conexao=?, endereco=?, porta=?, vendor_id=?, product_id=?, ativo=? WHERE id=?",
        [data['nome'], data['tipo'], data['conexao'], data.get('endereco', ''), data.get('porta', 9100), data.get('vendor_id', ''), data.get('product_id', ''), data.get('ativo', 1), id])
    _log('editou', 'impressora', id, data['nome'])
    return jsonify({'mensagem': 'Impressora atualizada'})

@bp.route('/api/impressoras/<int:id>', methods=['DELETE'])
def excluir_impressora(id):
    err = _verificar_senha()
    if err: return err
    imp = query_db("SELECT nome FROM impressoras WHERE id=?", [id], one=True)
    execute_db("DELETE FROM impressoras WHERE id=?", [id])
    _log('removeu', 'impressora', id, imp['nome'] if imp else '')
    return jsonify({'mensagem': 'Impressora removida'})


# ============================================
# CONFIGURAÇÕES
# ============================================

@bp.route('/api/configuracoes', methods=['GET'])
def listar_configuracoes():
    configs = query_db("SELECT * FROM configuracoes")
    return jsonify({c['chave']: c['valor'] for c in configs})

@bp.route('/api/configuracoes', methods=['PUT'])
def salvar_configuracoes():
    err = _verificar_senha()
    if err: return err
    data = request.json
    for chave, valor in data.items():
        execute_db("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [chave, str(valor)])
    _log('editou', 'configuracoes', None, ', '.join(data.keys()))
    return jsonify({'mensagem': 'Configurações salvas'})
