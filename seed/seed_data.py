"""
Dados iniciais - Cardápio real baseado nas fotos do restaurante.
Executar: python seed/seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import init_db, execute_db, query_db


def seed():
    init_db()
    if query_db("SELECT COUNT(*) as c FROM categorias")[0]['c'] > 0:
        print("Banco já possui dados. Delete database/restaurante.db para recriar.")
        return

    print("Populando banco com cardápio real...")

    # CONFIG
    execute_db("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['nome_restaurante', 'Griletto'])
    execute_db("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['modo_simulacao_impressora', '1'])

    # ==========================================
    # ACOMPANHAMENTOS
    # ==========================================
    acomps = {}
    for nome in ['Arroz Branco', 'Feijao', 'Fritas', 'Pure', 'Batata Palito', 'Batata Chips', 'Batata Palha',
                  'Legumes', 'Salada', 'Farofa', 'Creme de Milho', 'Macarrao na Manteiga', 'Molho de Iogurte']:
        aid = execute_db("INSERT INTO acompanhamentos (nome) VALUES (?)", [nome])
        acomps[nome] = aid
    print(f"  {len(acomps)} acompanhamentos")

    # ==========================================
    # EXTRAS
    # ==========================================
    extras = {}
    for nome, preco in [('Caldo', 4.50), ('Creme de Milho Extra', 4.50), ('Saladinha', 4.50), ('Acompanhamento Extra', 6.50)]:
        eid = execute_db("INSERT INTO extras (nome, preco) VALUES (?, ?)", [nome, preco])
        extras[nome] = eid
    print(f"  {len(extras)} extras")

    # ==========================================
    # BEBIDAS (do cardápio real)
    # ==========================================
    # (nome, preco, combo, especial, ordem)
    bebidas_data = [
        ('Refrigerante Lata', 5.90, 1, 1, 1),
        ('H2OH', 7.90, 1, 0, 2),
        ('Agua Mineral', 3.50, 0, 1, 3),
        ('Cha Lata', 5.90, 0, 0, 4),
        ('Suco Natural One 300ml', 8.90, 0, 0, 5),
        ('Guarana Lata', 5.90, 1, 1, 6),
        ('Red Bull', 13.00, 0, 0, 7),
        ('Chopp 300ml', 9.00, 0, 0, 8),
        ('Chopp 500ml', 14.00, 0, 0, 9),
        ('Cerveja Lata', 8.00, 0, 0, 10),
    ]
    for nome, preco, combo, especial, ordem in bebidas_data:
        execute_db("INSERT INTO bebidas (nome, preco, participa_combo, participa_especial, ordem) VALUES (?, ?, ?, ?, ?)",
                   [nome, preco, combo, especial, ordem])
    print(f"  {len(bebidas_data)} bebidas")

    # ==========================================
    # SOBREMESAS (R$ 7,50 todas no combo)
    # ==========================================
    sobremesas_data = [
        ('Brigadeirao', 7.50, 1, 1),
        ('Torta Holandesa', 7.50, 1, 2),
        ('La Mus Alpino', 7.50, 1, 3),
        ('La Mus Prestigio', 7.50, 1, 4),
    ]
    for nome, preco, combo, ordem in sobremesas_data:
        execute_db("INSERT INTO sobremesas (nome, preco, participa_combo, ordem) VALUES (?, ?, ?, ?)", [nome, preco, combo, ordem])
    print(f"  {len(sobremesas_data)} sobremesas")

    # ==========================================
    # REGRA DE COMBO (única: +R$ 10,90)
    # ==========================================
    regra_id = execute_db(
        "INSERT INTO regras_combo (nome, descricao, valor_adicional, exige_bebida, exige_sobremesa) VALUES (?, ?, ?, ?, ?)",
        ['Combo Completo', 'Prato + Bebida Lata + Sobremesa por +R$ 10,90', 10.90, 1, 1]
    )
    print("  1 regra de combo (+R$ 10,90)")

    # ==========================================
    # CATEGORIAS
    # ==========================================

    # 0 - Cardápio Especial (bebida por R$ 3,00)
    cat_especial = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo, preco_bebida_especial) VALUES (?, ?, ?, ?, ?, ?)",
        ['Cardapio Especial', 0, 0, '', 'Arroz + Feijao + Fritas', 3.00]
    )

    # 1 - Top Griletto (fixo: Arroz+Feijao+Fritas, sem escolha)
    cat_top = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Top Griletto', 1, 0, '', 'Arroz + Feijao + Fritas']
    )

    # 2 - Express (fixo: Arroz+Feijao+Fritas+Salada, pode trocar fritas por purê)
    cat_express = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Express', 2, 1, 'Trocar fritas por pure?', 'Arroz + Feijao + Fritas + Salada']
    )
    # Vincular extras do Express
    for ename in ['Caldo', 'Creme de Milho Extra', 'Saladinha']:
        execute_db("INSERT INTO categoria_extra (categoria_id, extra_id) VALUES (?, ?)", [cat_express, extras[ename]])

    # 3 - Parmegianas (escolher 1: Batata palito ou Chips)
    cat_parmeg = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Parmegianas', 3, 1, 'Escolha entre', '']
    )

    # 4 - Direto da Grelha (escolher 3 acompanhamentos + saladinha)
    cat_grelha = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Direto da Grelha', 4, 3, 'Escolha 3 acompanhamentos', 'Inclui saladinha']
    )
    # Vincular extra de acompanhamento extra
    execute_db("INSERT INTO categoria_extra (categoria_id, extra_id) VALUES (?, ?)", [cat_grelha, extras['Acompanhamento Extra']])

    # 5 - Tempero Brasileiro (escolher 1: Batata palito ou Palha)
    cat_brasileiro = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Tempero Brasileiro', 5, 1, 'Escolha entre', '']
    )

    # 6 - Levissimos (sem acompanhamento de escolha)
    cat_leves = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Levissimos', 6, 0, '', '']
    )

    # 7 - Do Seu Jeito (escolher 1: Fritas, Legumes ou Purê)
    cat_jeito = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Do Seu Jeito', 7, 1, 'Escolha o acompanhamento', '']
    )

    # 8 - Mamma Mia (sem escolha de acompanhamento)
    cat_massa = execute_db(
        "INSERT INTO categorias (nome, ordem, qtd_acompanhamentos, acompanhamento_label, acompanhamento_fixo) VALUES (?, ?, ?, ?, ?)",
        ['Mamma Mia', 8, 0, '', '']
    )

    print("  9 categorias")

    # ==========================================
    # PRODUTOS
    # ==========================================
    total = 0

    def criar_produto(cat_id, nome, desc, preco, tem_combo, ordem, acomp_nomes=None):
        nonlocal total
        pid = execute_db(
            "INSERT INTO produtos (categoria_id, nome, descricao, preco, tem_combo, ordem) VALUES (?, ?, ?, ?, ?, ?)",
            [cat_id, nome, desc, preco, tem_combo, ordem]
        )
        if acomp_nomes:
            for an in acomp_nomes:
                if an in acomps:
                    execute_db("INSERT OR IGNORE INTO produto_acompanhamento (produto_id, acompanhamento_id) VALUES (?, ?)", [pid, acomps[an]])
        # Vincular regra combo
        if tem_combo:
            execute_db("INSERT OR IGNORE INTO produto_regra_combo (produto_id, regra_combo_id) VALUES (?, ?)", [pid, regra_id])
        total += 1
        return pid

    # CARDÁPIO ESPECIAL - bebida por R$ 3,00
    criar_produto(cat_especial, 'Toscaninha', 'Linguica toscana fatiada', 18.90, 0, 1)
    criar_produto(cat_especial, 'Fritas de Carne', 'Tiras de carne com fritas', 18.90, 0, 2)
    criar_produto(cat_especial, 'Iscas de Frango Empanado', 'Iscas crocantes', 18.90, 0, 3)
    criar_produto(cat_especial, 'Bisteca Suina', 'Bisteca suina grelhada', 23.90, 0, 4)
    criar_produto(cat_especial, 'Calabresa Acebolada', 'Calabresa com cebola', 23.90, 0, 5)
    criar_produto(cat_especial, 'Parmegiana de Frango', 'Frango a parmegiana', 26.90, 0, 6)

    # TOP GRILETTO - R$ 21,90 fixo
    criar_produto(cat_top, 'Toscaninha', 'Linguica toscana fatiada', 21.90, 1, 1)
    criar_produto(cat_top, 'Tiras de Lombo Acebolado', 'Lombo em tiras com cebola', 21.90, 1, 2)
    criar_produto(cat_top, 'Iscas de Frango', 'Iscas de frango empanadas', 21.90, 1, 3)
    criar_produto(cat_top, 'Bisteca Suina', 'Bisteca suina grelhada', 21.90, 1, 4)
    criar_produto(cat_top, 'Calabresa Fatiada', 'Calabresa fatiada na chapa', 21.90, 1, 5)

    # EXPRESS
    acomp_express = ['Fritas', 'Pure']
    criar_produto(cat_express, 'Filezinho de Frango', 'File de frango grelhado', 29.50, 1, 1, acomp_express)
    criar_produto(cat_express, 'Contrafile', 'Contrafile grelhado', 37.90, 1, 2, acomp_express)
    criar_produto(cat_express, 'Contrafile Acebolado', 'Contrafile com cebola', 39.90, 1, 3, acomp_express)
    criar_produto(cat_express, 'Iscas de Carne', 'Iscas de carne', 31.50, 1, 4, acomp_express)
    criar_produto(cat_express, 'Bife a Cavalo', 'Bife com ovo', 35.50, 1, 5, acomp_express)
    criar_produto(cat_express, 'Lombo Suino', 'Lombo suino grelhado', 30.90, 1, 6, acomp_express)
    criar_produto(cat_express, 'Lombo a Milanesa', 'Lombo empanado', 31.50, 1, 7, acomp_express)
    criar_produto(cat_express, 'Omelete', 'Omelete completa', 28.90, 1, 8, acomp_express)

    # PARMEGIANAS
    acomp_parmeg = ['Batata Palito', 'Batata Chips']
    criar_produto(cat_parmeg, 'Frango a Parmegiana', 'Peito de frango empanado', 29.90, 1, 1, acomp_parmeg)
    criar_produto(cat_parmeg, 'Carne a Parmegiana', 'File bovino empanado', 35.90, 1, 2, acomp_parmeg)
    criar_produto(cat_parmeg, 'Berinjela a Parmegiana', 'Berinjela empanada', 29.50, 1, 3, acomp_parmeg)

    # DIRETO DA GRELHA (3 acompanhamentos)
    acomp_grelha = ['Arroz Branco', 'Feijao', 'Fritas', 'Legumes', 'Pure', 'Batata Chips',
                     'Creme de Milho', 'Farofa', 'Macarrao na Manteiga', 'Molho de Iogurte']
    criar_produto(cat_grelha, 'File Angus', 'File angus premium', 44.90, 1, 1, acomp_grelha)
    criar_produto(cat_grelha, 'Picanha Premium', 'Picanha na chapa', 51.90, 1, 2, acomp_grelha)
    criar_produto(cat_grelha, 'Churrasco', 'Churrasco misto', 44.90, 1, 3, acomp_grelha)
    criar_produto(cat_grelha, 'Contrafile', 'Contrafile na grelha', 43.90, 1, 4, acomp_grelha)
    criar_produto(cat_grelha, 'Salmao', 'File de salmao grelhado', 49.90, 1, 5, acomp_grelha)
    criar_produto(cat_grelha, 'File de Frango', 'File de frango grelhado', 34.50, 1, 6, acomp_grelha)
    criar_produto(cat_grelha, 'File de Tilapia', 'File de tilapia grelhado', 40.90, 1, 7, acomp_grelha)
    criar_produto(cat_grelha, 'Bife a Milanesa', 'Bife empanado', 37.90, 1, 8, acomp_grelha)
    criar_produto(cat_grelha, 'File de Frango a Milanesa', 'Frango empanado', 33.90, 1, 9, acomp_grelha)
    criar_produto(cat_grelha, 'File Mignon', 'File mignon grelhado', 51.90, 1, 10, acomp_grelha)

    # TEMPERO BRASILEIRO
    acomp_brasileiro = ['Batata Palito', 'Batata Palha']
    criar_produto(cat_brasileiro, 'Entrecote a Mineira', 'Entrecote com ovo e feijao tropeiro', 29.90, 1, 1, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Dupla Perfeita', 'Dois cortes especiais', 46.90, 1, 2, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Maminha em Iscas', 'Maminha fatiada em iscas', 33.90, 1, 3, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Picadinho Brasileiro', 'Picadinho com ovo', 29.90, 1, 4, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Iscas de Frango Empanado', 'Iscas crocantes', 22.90, 1, 5, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Strogonoff de Frango', 'Strogonoff cremoso', 29.90, 1, 6, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Strogonoff de Carne', 'Strogonoff cremoso', 34.90, 1, 7, acomp_brasileiro)
    criar_produto(cat_brasileiro, 'Frango com Creme de Milho', 'File de frango com creme', 29.50, 1, 8, acomp_brasileiro)

    # LEVÍSSIMOS (sem acompanhamento)
    criar_produto(cat_leves, 'Salada Caesar', 'Salada caesar classica', 27.90, 1, 1)
    criar_produto(cat_leves, 'Parma Veggie', 'Parmegiana vegetariana', 31.00, 1, 2)
    criar_produto(cat_leves, 'Salada Crocante c/ Frango', 'Salada com file de frango', 29.50, 1, 3)
    criar_produto(cat_leves, 'Salada Crocante c/ Tilapia', 'Salada com file de tilapia', 40.90, 1, 4)
    criar_produto(cat_leves, 'Salada Crocante c/ Omelete', 'Salada com omelete', 28.90, 1, 5)

    # DO SEU JEITO
    acomp_jeito = ['Fritas', 'Legumes', 'Pure']
    criar_produto(cat_jeito, 'Casa Frango', 'Montagem com frango', 26.90, 1, 1, acomp_jeito)
    criar_produto(cat_jeito, 'Casa Carne', 'Montagem com carne', 29.90, 1, 2, acomp_jeito)

    # MAMMA MIA (massas, sem escolha)
    criar_produto(cat_massa, 'Talharim ao Molho', 'Talharim com banho de molho', 19.90, 1, 1)
    criar_produto(cat_massa, 'Talharim c/ Tiras de Frango', 'Com tiras de frango', 22.90, 1, 2)
    criar_produto(cat_massa, 'Talharim c/ Tiras de Carne', 'Com tiras de carne', 26.90, 1, 3)

    print(f"  {total} produtos")

    # IMPRESSORAS SIMULAÇÃO
    execute_db("INSERT INTO impressoras (nome, tipo, conexao, endereco, porta) VALUES (?, ?, ?, ?, ?)",
               ['Impressora Caixa', 'caixa', 'usb', '', 0])
    execute_db("INSERT INTO impressoras (nome, tipo, conexao, endereco, porta) VALUES (?, ?, ?, ?, ?)",
               ['Impressora Cozinha', 'cozinha', 'rede', '192.168.1.100', 9100])

    print("\nSeed concluido!")
    print("Inicie com: python run.py")
    print("Acesse: http://localhost:5555")


if __name__ == '__main__':
    seed()
