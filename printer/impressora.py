"""
Módulo de impressão para impressoras térmicas ESC/POS.
Suporta:
  - Impressora USB (i9 no caixa)
  - Impressora de rede TCP/IP (cozinha)
  - Modo simulação (gera arquivo texto para testes)
"""
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

PRINT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'impressoes')


def _get_impressora_escpos(config):
    """Retorna instância de impressora ESC/POS conforme configuração."""
    try:
        from escpos.printer import Usb, Network

        if config['conexao'] == 'usb':
            vendor_id = int(config.get('vendor_id', '0x0'), 16) if config.get('vendor_id') else 0
            product_id = int(config.get('product_id', '0x0'), 16) if config.get('product_id') else 0
            if vendor_id and product_id:
                return Usb(vendor_id, product_id)
            logger.warning("Impressora USB sem vendor_id/product_id configurados")
            return None
        elif config['conexao'] == 'rede':
            endereco = config.get('endereco', '')
            porta = int(config.get('porta', 9100))
            if endereco:
                return Network(endereco, port=porta)
            logger.warning("Impressora de rede sem endereço configurado")
            return None
    except ImportError:
        logger.warning("python-escpos não instalado, usando modo simulação")
        return None
    except Exception as e:
        logger.error(f"Erro ao conectar impressora: {e}")
        return None


def _salvar_simulacao(texto, tipo):
    """Salva impressão em arquivo texto (modo simulação)."""
    os.makedirs(PRINT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{tipo}_{timestamp}.txt"
    filepath = os.path.join(PRINT_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(texto)
    logger.info(f"Impressão simulada salva em: {filepath}")
    return filepath


def imprimir_caixa(pedido, itens, config_impressora=None, simulacao=True):
    """
    Imprime comprovante completo no caixa.
    Retorna dict com status e mensagem.
    """
    texto = _formatar_comprovante_caixa(pedido, itens)

    if simulacao or not config_impressora:
        filepath = _salvar_simulacao(texto, 'caixa')
        return {'sucesso': True, 'mensagem': f'Simulação salva: {filepath}', 'simulacao': True}

    impressora = _get_impressora_escpos(config_impressora)
    if not impressora:
        filepath = _salvar_simulacao(texto, 'caixa')
        return {'sucesso': False, 'mensagem': 'Impressora não disponível. Simulação salva.', 'simulacao': True}

    try:
        impressora.set(align='center', bold=True, double_height=True)
        impressora.text(pedido.get('nome_restaurante', 'RESTAURANTE') + '\n')
        impressora.set(align='center', bold=False, double_height=False)
        impressora.text('=' * 42 + '\n')
        impressora.set(align='center', bold=True, double_height=True)
        impressora.text(f"PEDIDO #{pedido['numero']:03d}\n")
        impressora.set(align='left', bold=False, double_height=False)
        impressora.text(f"Data: {pedido['data_hora']}\n")
        impressora.text('=' * 42 + '\n\n')

        for item in itens:
            impressora.set(bold=True)
            impressora.text(f"{item['produto_nome']}\n")
            impressora.set(bold=False)
            if item.get('acompanhamento_nome'):
                impressora.text(f"  Acomp: {item['acompanhamento_nome']}\n")
            if item.get('bebida_nome'):
                impressora.text(f"  Bebida: {item['bebida_nome']}\n")
            if item.get('sobremesa_nome'):
                impressora.text(f"  Sobremesa: {item['sobremesa_nome']}\n")
            if item.get('combo_aplicado'):
                impressora.text(f"  ** COMBO **\n")
            impressora.set(align='right')
            impressora.text(f"R$ {item['subtotal']:.2f}\n")
            impressora.set(align='left')
            if item.get('observacao'):
                impressora.text(f"  Obs: {item['observacao']}\n")
            impressora.text('-' * 42 + '\n')

        impressora.text('\n')
        impressora.set(align='right', bold=True, double_height=True)
        impressora.text(f"TOTAL: R$ {pedido['total']:.2f}\n")
        impressora.set(align='center', bold=False, double_height=False)

        if pedido.get('observacao'):
            impressora.text(f"\nObs: {pedido['observacao']}\n")

        impressora.text('\n' + '=' * 42 + '\n')
        impressora.text('Obrigado pela preferência!\n')
        impressora.cut()
        impressora.close()

        return {'sucesso': True, 'mensagem': 'Impresso no caixa com sucesso', 'simulacao': False}
    except Exception as e:
        logger.error(f"Erro ao imprimir no caixa: {e}")
        filepath = _salvar_simulacao(texto, 'caixa')
        return {'sucesso': False, 'mensagem': f'Erro: {e}. Simulação salva.', 'simulacao': True}


def imprimir_cozinha(pedido, itens, config_impressora=None, simulacao=True):
    """
    Imprime pedido simplificado na cozinha (sem preços).
    Retorna dict com status e mensagem.
    """
    texto = _formatar_pedido_cozinha(pedido, itens)

    if simulacao or not config_impressora:
        filepath = _salvar_simulacao(texto, 'cozinha')
        return {'sucesso': True, 'mensagem': f'Simulação salva: {filepath}', 'simulacao': True}

    impressora = _get_impressora_escpos(config_impressora)
    if not impressora:
        filepath = _salvar_simulacao(texto, 'cozinha')
        return {'sucesso': False, 'mensagem': 'Impressora não disponível. Simulação salva.', 'simulacao': True}

    try:
        from datetime import datetime as dt_cls

        # Cabeçalho PRODUCAO
        impressora.set(align='center', bold=True, double_height=True)
        impressora.text("PRODUCAO\n")
        impressora.set(align='left', bold=False, double_height=False)
        impressora.text('\n')

        # PAGER grande e destacado
        if pedido.get('pager'):
            impressora.set(bold=True, double_height=True, double_width=True)
            impressora.text(f"PAGER: {pedido['pager']}\n")
            impressora.set(bold=False, double_height=False, double_width=False)

        impressora.text(f"PDV: 01\n")
        impressora.text(f"OPR: CAIXA\n")

        data_hora = pedido.get('data_hora', '')
        try:
            dto = dt_cls.strptime(data_hora, '%Y-%m-%d %H:%M:%S')
            data_fmt = dto.strftime('%d/%m/%Y %H:%M')
        except (ValueError, TypeError):
            data_fmt = data_hora
        impressora.text(f"HORA:{data_fmt}\n\n")

        impressora.set(bold=True)
        impressora.text("QT. PRODUTO\n")
        impressora.set(bold=False)

        # Itens
        for item in itens:
            impressora.set(bold=True)
            impressora.text(f"1  {item['produto_nome'].upper()}\n")
            impressora.set(bold=False)

            if item.get('acompanhamentos_txt'):
                for acomp in item['acompanhamentos_txt'].split(', '):
                    impressora.text(f"     {acomp.upper()}\n")
            if item.get('combo_aplicado'):
                impressora.text(f"     S PROMO\n")
            if item.get('observacao'):
                impressora.set(bold=True)
                impressora.text(f"     OBS: {item['observacao'].upper()}\n")
                impressora.set(bold=False)

        # Bebidas separadas
        for item in itens:
            if item.get('bebida_nome'):
                impressora.text(f"1  {item['bebida_nome'].upper()}\n")
                impressora.text(f"     * LATA\n")

        # Sobremesas separadas
        for item in itens:
            if item.get('sobremesa_nome'):
                impressora.text(f"1  {item['sobremesa_nome'].upper()}\n")

        # Extras separados
        for item in itens:
            if item.get('extras_txt'):
                for extra in item['extras_txt'].split(', '):
                    impressora.text(f"1  {extra.upper()}\n")

        impressora.text('\n')
        if pedido.get('observacao'):
            impressora.set(bold=True)
            impressora.text(f"OBS: {pedido['observacao'].upper()}\n")
            impressora.set(bold=False)
            impressora.text('\n')

        impressora.text("SEM VALOR FISCAL\n")
        impressora.cut()
        impressora.close()

        return {'sucesso': True, 'mensagem': 'Impresso na cozinha com sucesso', 'simulacao': False}
    except Exception as e:
        logger.error(f"Erro ao imprimir na cozinha: {e}")
        filepath = _salvar_simulacao(texto, 'cozinha')
        return {'sucesso': False, 'mensagem': f'Erro: {e}. Simulação salva.', 'simulacao': True}


def _formatar_comprovante_caixa(pedido, itens):
    """Formata texto do comprovante do caixa."""
    linhas = []
    linhas.append('=' * 42)
    linhas.append(f"  {pedido.get('nome_restaurante', 'RESTAURANTE')}")
    linhas.append('=' * 42)
    linhas.append(f"  PEDIDO #{pedido['numero']:03d}")
    if pedido.get('pager'):
        linhas.append(f"  *** PAGER: {pedido['pager']} ***")
    linhas.append(f"  Data: {pedido['data_hora']}")
    linhas.append('=' * 42)
    linhas.append('')

    for item in itens:
        linhas.append(f"  {item['produto_nome']}")
        if item.get('acompanhamentos_txt'):
            linhas.append(f"    Acomp: {item['acompanhamentos_txt']}")
        if item.get('bebida_nome'):
            linhas.append(f"    Bebida: {item['bebida_nome']}")
        if item.get('sobremesa_nome'):
            linhas.append(f"    Sobremesa: {item['sobremesa_nome']}")
        if item.get('extras_txt'):
            linhas.append(f"    Extras: {item['extras_txt']}")
        if item.get('combo_aplicado'):
            linhas.append(f"    ** COMBO (+R${item.get('valor_combo', 0):.2f}) **")
        linhas.append(f"    R$ {item['subtotal']:.2f}")
        if item.get('observacao'):
            linhas.append(f"    Obs: {item['observacao']}")
        linhas.append('-' * 42)

    linhas.append('')
    if pedido.get('desconto', 0) > 0:
        linhas.append(f"  Desconto: R$ {pedido['desconto']:.2f}")
    linhas.append(f"  TOTAL: R$ {pedido['total']:.2f}")
    linhas.append('')

    if pedido.get('observacao'):
        linhas.append(f"  Obs: {pedido['observacao']}")
        linhas.append('')

    linhas.append('=' * 42)
    linhas.append('  Obrigado pela preferência!')
    linhas.append('=' * 42)

    return '\n'.join(linhas)


def _formatar_pedido_cozinha(pedido, itens):
    """Formata pedido cozinha no padrão de produção (igual impressora real)."""
    from datetime import datetime

    linhas = []
    linhas.append('')
    linhas.append('        PRODUCAO')
    linhas.append('')

    # Pager grande e destacado
    if pedido.get('pager'):
        linhas.append(f'  PAGER: {pedido["pager"]}')
    linhas.append(f'  PDV: 01')
    linhas.append(f'  OPR: CAIXA')

    # Formatar data no padrão DD/MM/YYYY HH:MM
    data_hora = pedido.get('data_hora', '')
    try:
        dt = datetime.strptime(data_hora, '%Y-%m-%d %H:%M:%S')
        data_fmt = dt.strftime('%d/%m/%Y %H:%M')
    except (ValueError, TypeError):
        data_fmt = data_hora
    linhas.append(f'  HORA:{data_fmt}')
    linhas.append('')
    linhas.append('  QT. PRODUTO')

    # Itens no formato: quantidade + nome + acompanhamentos abaixo
    for item in itens:
        linhas.append(f'  1  {item["produto_nome"].upper()}')

        # Acompanhamentos como subitens
        if item.get('acompanhamentos_txt'):
            for acomp in item['acompanhamentos_txt'].split(', '):
                linhas.append(f'       {acomp.upper()}')

        # Combo flag
        if item.get('combo_aplicado'):
            linhas.append(f'       S PROMO')

        # Observação do item
        if item.get('observacao'):
            linhas.append(f'       OBS: {item["observacao"].upper()}')

    # Bebidas separadas
    for item in itens:
        if item.get('bebida_nome'):
            linhas.append(f'  1  {item["bebida_nome"].upper()}')
            linhas.append(f'       * LATA')

    # Sobremesas separadas
    for item in itens:
        if item.get('sobremesa_nome'):
            linhas.append(f'  1  {item["sobremesa_nome"].upper()}')

    # Extras separados
    for item in itens:
        if item.get('extras_txt'):
            for extra in item['extras_txt'].split(', '):
                linhas.append(f'  1  {extra.upper()}')

    linhas.append('')

    # Observação geral
    if pedido.get('observacao'):
        linhas.append(f'  OBS: {pedido["observacao"].upper()}')
        linhas.append('')

    linhas.append('  SEM VALOR FISCAL')
    linhas.append('')

    return '\n'.join(linhas)
