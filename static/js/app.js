/**
 * Restaurante PDV - App principal v2
 * Fluxo com múltiplos acompanhamentos, extras pagos, combo automático (+R$10,90)
 */

let pedidoAtual = { itens: [], observacao: '' };

// Estado da montagem de item
let itemAtual = {
    produto: null,
    acompanhamento_ids: [],
    acompanhamentos_pendentes: 0, // quantos faltam escolher
    bebida_id: null,
    sobremesa_id: null,
    extra_ids: [],
    observacao: ''
};

// ============================================
// UTILIDADES
// ============================================

// Páginas que exigem login admin
const PAGINAS_ADMIN = ['cadastro-categorias', 'cadastro-produtos', 'cadastro-acompanhamentos',
    'cadastro-bebidas', 'cadastro-sobremesas', 'cadastro-extras', 'regras-combo', 'impressoras'];

function atualizarMenuAdmin() {
    const logado = !!getSenhaAdmin();
    const menuAdmin = document.getElementById('menu-admin');
    const menuLogin = document.getElementById('menu-login');
    if (menuAdmin) menuAdmin.style.display = logado ? 'block' : 'none';
    if (menuLogin) menuLogin.style.display = logado ? 'none' : 'block';
}

function navegarPara(pagina) {
    if (PAGINAS_ADMIN.includes(pagina) && !getSenhaAdmin()) {
        toast('Faca login primeiro', 'aviso');
        return;
    }

    document.querySelectorAll('.pagina').forEach(p => p.classList.add('hidden'));
    const el = document.getElementById('pagina-' + pagina);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`.sidebar-nav a[data-pagina="${pagina}"]`);
    if (link) link.classList.add('active');

    const loaders = {
        'novo-pedido': carregarNovoPedido, 'pedidos-dia': carregarPedidosDia,
        'cadastro-categorias': carregarCadastroCategorias, 'cadastro-produtos': carregarCadastroProdutos,
        'cadastro-acompanhamentos': carregarCadastroAcompanhamentos, 'cadastro-bebidas': carregarCadastroBebidas,
        'cadastro-sobremesas': carregarCadastroSobremesas, 'cadastro-extras': carregarCadastroExtras,
        'regras-combo': carregarRegrasCombo, 'impressoras': carregarImpressoras
    };
    if (loaders[pagina]) loaders[pagina]();

    const painelLogs = document.getElementById('painel-logs');
    if (painelLogs) {
        if (PAGINAS_ADMIN.includes(pagina)) {
            painelLogs.style.display = 'block';
            carregarLogsNaPagina();
        } else {
            painelLogs.style.display = 'none';
        }
    }
}

function toggleLogs() {
    const p = document.getElementById('painel-logs');
    if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function mostrarLoginAdmin() {
    document.getElementById('modal-container').innerHTML = `
        <div class="modal-overlay">
            <div class="modal" style="max-width:380px;text-align:center">
                <h3 style="margin-bottom:4px">Login Administrativo</h3>
                <p style="color:var(--text-light);margin-bottom:20px">Informe usuario e senha</p>
                <div class="form-group" style="text-align:left">
                    <label>Usuario</label>
                    <input type="text" class="form-control" id="input-admin-user" placeholder="Usuario" autofocus
                        style="font-size:18px">
                </div>
                <div class="form-group" style="text-align:left">
                    <label>Senha</label>
                    <input type="password" class="form-control" id="input-admin-senha" placeholder="Senha"
                        style="font-size:18px;letter-spacing:4px"
                        onkeydown="if(event.key==='Enter') executarLoginAdmin()">
                </div>
                <p id="erro-login-admin" style="color:var(--danger);font-weight:600;margin-top:8px;display:none">Usuario ou senha incorretos</p>
                <div class="modal-actions" style="justify-content:center;margin-top:20px">
                    <button class="btn btn-outline" onclick="fecharModalForce()">Cancelar</button>
                    <button class="btn btn-primary btn-lg" onclick="executarLoginAdmin()" style="min-width:140px">Entrar</button>
                </div>
            </div>
        </div>`;
    setTimeout(() => document.getElementById('input-admin-user')?.focus(), 100);
}

async function executarLoginAdmin() {
    const usuario = document.getElementById('input-admin-user').value;
    const senha = document.getElementById('input-admin-senha').value;
    try {
        await API.admin.login(usuario, senha);
        setSenhaAdmin(senha);
        fecharModalForce();
        atualizarMenuAdmin();
        toast('Login realizado');
        navegarPara('cadastro-categorias');
    } catch (e) {
        document.getElementById('erro-login-admin').style.display = 'block';
        document.getElementById('input-admin-senha').value = '';
        document.getElementById('input-admin-senha').focus();
    }
}

function logoutAdmin() {
    limparSenhaAdmin();
    atualizarMenuAdmin();
    toast('Sessao admin encerrada');
    navegarPara('novo-pedido');
    const painelLogs = document.getElementById('painel-logs');
    if (painelLogs) painelLogs.style.display = 'none';
}

async function carregarLogsNaPagina() {
    const container = document.getElementById('area-logs');
    if (!container) return;
    try {
        const logs = await API.logs.listar();
        if (logs.length === 0) {
            container.innerHTML = '<p style="color:var(--text-light);padding:12px">Nenhuma alteracao registrada</p>';
            return;
        }
        container.innerHTML = `<div style="max-height:250px;overflow-y:auto">
            <table style="width:100%;font-size:13px">
                <thead><tr><th>Data/Hora</th><th>Acao</th><th>Item</th><th>Detalhe</th></tr></thead>
                <tbody>${logs.slice(0, 50).map(l => `<tr>
                    <td style="white-space:nowrap;color:var(--text-light)">${l.data_hora}</td>
                    <td><span class="badge ${l.acao === 'criou' ? 'badge-success' : l.acao === 'desativou' || l.acao === 'removeu' ? 'badge-danger' : 'badge-warning'}">${l.acao}</span></td>
                    <td>${l.entidade}</td>
                    <td>${l.detalhe || '-'}</td>
                </tr>`).join('')}</tbody>
            </table>
        </div>`;
    } catch (e) { container.innerHTML = ''; }
}

function toast(msg, tipo = 'sucesso') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${tipo === 'erro' ? 'erro' : tipo === 'aviso' ? 'aviso' : ''}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function formatarPreco(valor) {
    return 'R$ ' + (valor || 0).toFixed(2).replace('.', ',');
}

function fecharModal(event) {
    if (event.target.classList.contains('modal-overlay')) document.getElementById('modal-container').innerHTML = '';
}
function fecharModalForce() { document.getElementById('modal-container').innerHTML = ''; }

// ============================================
// FLUXO DO PEDIDO - CATEGORIAS
// ============================================

async function carregarNovoPedido() {
    itemAtual = { produto: null, acompanhamento_ids: [], acompanhamentos_pendentes: 0, bebida_id: null, sobremesa_id: null, extra_ids: [], observacao: '' };
    mostrarEtapaCategorias();
    atualizarCarrinho();
}

async function mostrarEtapaCategorias() {
    const area = document.getElementById('area-montagem');
    area.innerHTML = `
        <div class="text-center" style="margin-bottom:28px">
            <h3 style="font-size:28px;font-weight:800;color:var(--text)">Escolha a Categoria</h3>
            <p style="color:var(--text-light);margin-top:4px">Toque para selecionar</p>
        </div>
        <div id="grid-categorias" class="grid-cards grid-cards-4" style="gap:16px;max-width:1000px;margin:0 auto"></div>`;
    try {
        const categorias = await API.categorias.listar();
        let html = categorias.map((c, i) => `
            <div class="card-categoria cat-cor-${i % 10}" onclick="selecionarCategoria(${c.id})">
                <div class="card-nome">${c.nome}</div>
                ${c.acompanhamento_fixo ? `<div class="card-subtitulo">${c.acompanhamento_fixo}</div>` : ''}
            </div>
        `).join('');
        // Adicionar Bebidas e Sobremesas como categorias avulsas
        const corBebidas = categorias.length % 10;
        const corSobremesas = (categorias.length + 1) % 10;
        html += `
            <div class="card-categoria cat-cor-${corBebidas}" onclick="mostrarBebidasAvulsas()">
                <div class="card-nome">Bebidas</div>
                <div class="card-subtitulo">Avulso</div>
            </div>
            <div class="card-categoria cat-cor-${corSobremesas}" onclick="mostrarSobremesasAvulsas()">
                <div class="card-nome">Sobremesas</div>
                <div class="card-subtitulo">Avulso</div>
            </div>
        `;
        document.getElementById('grid-categorias').innerHTML = html;
    } catch (e) { toast('Erro ao carregar categorias', 'erro'); }
}

// Bebidas avulsas - adiciona direto ao carrinho
async function mostrarBebidasAvulsas() {
    const area = document.getElementById('area-montagem');
    area.innerHTML = `
        <div class="flex-between mb-20">
            <h3 style="font-size:22px;color:var(--primary)">Bebidas</h3>
            <button class="btn btn-outline btn-sm" onclick="mostrarEtapaCategorias()">Voltar</button>
        </div>
        <div id="grid-bebidas-avulsas" class="grid-cards grid-cards-4" style="gap:12px;max-width:900px;margin:0 auto"></div>`;
    try {
        const bebidas = await API.bebidas.listar(false);
        document.getElementById('grid-bebidas-avulsas').innerHTML = bebidas.map(b => `
            <div class="card-selecao" onclick="adicionarBebidaAvulsa(${b.id}, '${b.nome.replace(/'/g, "\\'")}', ${b.preco})">
                <div class="card-nome">${b.nome}</div>
                <div class="card-preco">${formatarPreco(b.preco)}</div>
            </div>
        `).join('');
    } catch (e) { toast('Erro ao carregar bebidas', 'erro'); }
}

function adicionarBebidaAvulsa(id, nome, preco) {
    pedidoAtual.itens.push({
        produto_nome: nome, produto_preco: preco,
        acompanhamentos_txt: '', bebida_nome: '', bebida_preco: 0, bebida_especial: 0,
        sobremesa_nome: '', sobremesa_preco: 0, extras_txt: '', extras_preco: 0,
        combo_aplicado: 0, valor_combo: 0, subtotal: preco, observacao: '',
        _dados: { produto_id: null, acompanhamento_ids: [], bebida_id: id, sobremesa_id: null, extra_ids: [], observacao: '', avulso: 'bebida' }
    });
    atualizarCarrinho();
    toast(`${nome} adicionado!`);
    mostrarEtapaCategorias();
}

// Sobremesas avulsas
async function mostrarSobremesasAvulsas() {
    const area = document.getElementById('area-montagem');
    area.innerHTML = `
        <div class="flex-between mb-20">
            <h3 style="font-size:22px;color:var(--primary)">Sobremesas</h3>
            <button class="btn btn-outline btn-sm" onclick="mostrarEtapaCategorias()">Voltar</button>
        </div>
        <div id="grid-sobremesas-avulsas" class="grid-cards grid-cards-4" style="gap:12px;max-width:900px;margin:0 auto"></div>`;
    try {
        const sobremesas = await API.sobremesas.listar(false);
        document.getElementById('grid-sobremesas-avulsas').innerHTML = sobremesas.map(s => `
            <div class="card-selecao" onclick="adicionarSobremesaAvulsa(${s.id}, '${s.nome.replace(/'/g, "\\'")}', ${s.preco})">
                <div class="card-nome">${s.nome}</div>
                <div class="card-preco">${formatarPreco(s.preco)}</div>
            </div>
        `).join('');
    } catch (e) { toast('Erro ao carregar sobremesas', 'erro'); }
}

function adicionarSobremesaAvulsa(id, nome, preco) {
    pedidoAtual.itens.push({
        produto_nome: nome, produto_preco: preco,
        acompanhamentos_txt: '', bebida_nome: '', bebida_preco: 0, bebida_especial: 0,
        sobremesa_nome: '', sobremesa_preco: 0, extras_txt: '', extras_preco: 0,
        combo_aplicado: 0, valor_combo: 0, subtotal: preco, observacao: '',
        _dados: { produto_id: null, acompanhamento_ids: [], bebida_id: null, sobremesa_id: id, extra_ids: [], observacao: '', avulso: 'sobremesa' }
    });
    atualizarCarrinho();
    toast(`${nome} adicionado!`);
    mostrarEtapaCategorias();
}

// ============================================
// FLUXO DO PEDIDO - PRODUTOS
// ============================================

async function selecionarCategoria(categoriaId) {
    const area = document.getElementById('area-montagem');
    area.innerHTML = '<div class="flex-between mb-20"><h3 style="font-size:22px;color:var(--primary)">Escolha o Prato</h3><button class="btn btn-outline btn-sm" onclick="mostrarEtapaCategorias()">Voltar</button></div><div id="grid-produtos" class="grid-cards grid-cards-4"></div>';
    try {
        const produtos = await API.produtos.listar(categoriaId);
        const grid = document.getElementById('grid-produtos');
        if (produtos.length === 0) {
            grid.innerHTML = '<p class="text-center" style="grid-column:1/-1;padding:40px;color:var(--text-light)">Nenhum produto nesta categoria</p>';
            return;
        }
        grid.innerHTML = produtos.map(p => {
            const temCombo = p.tem_combo && p.regra_combo;
            const precoCombo = temCombo ? p.preco + p.regra_combo.valor_adicional : 0;
            return `
            <div class="card-selecao" onclick="selecionarProduto(${p.id})">
                <div class="card-nome">${p.nome}</div>
                <div class="card-preco">${formatarPreco(p.preco)}</div>
                ${temCombo ? `<div class="card-combo">Combo: ${formatarPreco(precoCombo)}</div>` : ''}
                ${p.descricao ? `<div class="card-desc">${p.descricao}</div>` : ''}
            </div>`;
        }).join('');
    } catch (e) { toast('Erro ao carregar produtos', 'erro'); }
}

async function selecionarProduto(produtoId) {
    try {
        const produto = await API.produtos.obter(produtoId);
        itemAtual = {
            produto, acompanhamento_ids: [], acompanhamentos_pendentes: produto.qtd_acompanhamentos || 0,
            bebida_id: null, sobremesa_id: null, extra_ids: [], observacao: ''
        };

        // Se tem acompanhamento fixo (ex: "Arroz + Feijão + Fritas + Salada"), mostra info
        // Se tem acompanhamentos para escolher, inicia seleção
        if (produto.acompanhamentos && produto.acompanhamentos.length > 0 && itemAtual.acompanhamentos_pendentes > 0) {
            mostrarEtapaAcompanhamento();
        } else {
            mostrarEtapaBebida();
        }
    } catch (e) { toast('Erro ao carregar produto', 'erro'); }
}

// ============================================
// FLUXO - ACOMPANHAMENTOS (MÚLTIPLOS)
// ============================================

function mostrarEtapaAcompanhamento() {
    const produto = itemAtual.produto;
    const total = produto.qtd_acompanhamentos || 1;
    const escolhidos = itemAtual.acompanhamento_ids.length;
    const falta = total - escolhidos;
    const area = document.getElementById('area-montagem');

    // Filtrar acompanhamentos já escolhidos
    const disponiveis = produto.acompanhamentos.filter(a => !itemAtual.acompanhamento_ids.includes(a.id));

    area.innerHTML = `
        <div class="flex-between mb-20">
            <div>
                <h3 style="font-size:22px;color:var(--primary)">${produto.acompanhamento_label || 'Escolha o acompanhamento'}</h3>
                <p style="color:var(--text-light)">${produto.nome} &mdash; Escolha ${falta} de ${total}
                ${produto.acompanhamento_fixo ? `<br><small>Acompanha: ${produto.acompanhamento_fixo}</small>` : ''}</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="voltarAcompanhamento()">Voltar</button>
        </div>
        ${escolhidos > 0 ? `<div class="mb-12" style="display:flex;gap:6px;flex-wrap:wrap">${itemAtual.acompanhamento_ids.map((aid, i) => {
            const nome = produto.acompanhamentos.find(a => a.id === aid)?.nome || '';
            return `<span class="badge badge-success">${nome} <span style="cursor:pointer" onclick="removerAcompanhamento(${i})">&times;</span></span>`;
        }).join('')}</div>` : ''}
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
            ${disponiveis.map(a => `
                <div class="opcao-rapida" onclick="selecionarAcompanhamento(${a.id})">${a.nome}</div>
            `).join('')}
        </div>
    `;
}

function selecionarAcompanhamento(acompId) {
    itemAtual.acompanhamento_ids.push(acompId);
    const total = itemAtual.produto.qtd_acompanhamentos || 1;
    if (itemAtual.acompanhamento_ids.length >= total) {
        mostrarEtapaBebida();
    } else {
        mostrarEtapaAcompanhamento();
    }
}

function removerAcompanhamento(index) {
    itemAtual.acompanhamento_ids.splice(index, 1);
    mostrarEtapaAcompanhamento();
}

function voltarAcompanhamento() {
    if (itemAtual.acompanhamento_ids.length > 0) {
        itemAtual.acompanhamento_ids = [];
        mostrarEtapaAcompanhamento();
    } else {
        selecionarCategoria(itemAtual.produto.categoria_id);
    }
}

// ============================================
// FLUXO - BEBIDA
// ============================================

async function mostrarEtapaBebida() {
    const produto = itemAtual.produto;
    const temCombo = produto.tem_combo && produto.regra_combo;
    const precoEspecial = produto.preco_bebida_especial || 0;
    const area = document.getElementById('area-montagem');

    let bebidas = await API.bebidas.listar(false);

    let subtituloExtra = '';
    if (temCombo) {
        subtituloExtra = ` &mdash; <span style="color:var(--success);font-weight:700">Combo disponivel! (+${formatarPreco(produto.regra_combo.valor_adicional)})</span>`;
    } else if (precoEspecial > 0) {
        subtituloExtra = ` &mdash; <span style="color:var(--success);font-weight:700">Bebida por apenas ${formatarPreco(precoEspecial)}!</span>`;
    }

    area.innerHTML = `
        <div class="flex-between mb-20">
            <div>
                <h3 style="font-size:22px;color:var(--primary)">Bebida?</h3>
                <p style="color:var(--text-light)">${produto.nome}${subtituloExtra}</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="voltarEtapaBebida()">Voltar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:20px">
            <div class="opcao-rapida nao" onclick="pularBebida()">
                <strong>Sem bebida</strong>
            </div>
        </div>
        <div class="grid-cards grid-cards-4" style="gap:12px;max-width:900px;margin:0 auto">
            ${bebidas.map(b => {
                let precoHtml, cssExtra = '';
                if (temCombo && b.participa_combo) {
                    precoHtml = '<div style="color:var(--success);font-weight:700;font-size:14px;margin-top:6px">incluso no combo</div>';
                    cssExtra = 'border-color:var(--success);';
                } else if (precoEspecial > 0 && b.participa_especial) {
                    precoHtml = `<div style="margin-top:6px"><span style="text-decoration:line-through;color:var(--text-light);font-size:13px">${formatarPreco(b.preco)}</span></div><div style="color:var(--success);font-weight:800;font-size:20px">${formatarPreco(precoEspecial)}</div>`;
                    cssExtra = 'border-color:var(--success);background:#f1f8e9;';
                } else {
                    precoHtml = `<div style="color:var(--text);font-weight:800;font-size:20px;margin-top:6px">${formatarPreco(b.preco)}</div>`;
                }
                return `<div class="card-selecao" onclick="selecionarBebida(${b.id})" style="${cssExtra}">
                    <div class="card-nome">${b.nome}</div>
                    ${precoHtml}
                </div>`;
            }).join('')}
        </div>
    `;
}

function voltarEtapaBebida() {
    const produto = itemAtual.produto;
    if (produto.acompanhamentos && produto.acompanhamentos.length > 0 && (produto.qtd_acompanhamentos || 0) > 0) {
        itemAtual.acompanhamento_ids = [];
        mostrarEtapaAcompanhamento();
    } else {
        selecionarCategoria(produto.categoria_id);
    }
}

function selecionarBebida(bebidaId) { itemAtual.bebida_id = bebidaId; mostrarEtapaSobremesa(); }
function pularBebida() { itemAtual.bebida_id = null; mostrarEtapaSobremesa(); }

// ============================================
// FLUXO - SOBREMESA
// ============================================

async function mostrarEtapaSobremesa() {
    const produto = itemAtual.produto;
    const temCombo = produto.tem_combo && produto.regra_combo;
    const area = document.getElementById('area-montagem');

    let sobremesas = await API.sobremesas.listar(false);

    area.innerHTML = `
        <div class="flex-between mb-20">
            <div>
                <h3 style="font-size:22px;color:var(--primary)">Sobremesa?</h3>
                <p style="color:var(--text-light)">${produto.nome}</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="mostrarEtapaBebida()">Voltar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:20px">
            <div class="opcao-rapida nao" onclick="pularSobremesa()">
                <strong>Sem sobremesa</strong>
            </div>
        </div>
        <div class="grid-cards grid-cards-4" style="gap:12px;max-width:900px;margin:0 auto">
            ${sobremesas.map(s => {
                let precoHtml, cssExtra = '';
                if (temCombo && s.participa_combo) {
                    precoHtml = '<div style="color:var(--success);font-weight:700;font-size:14px;margin-top:6px">incluso no combo</div>';
                    cssExtra = 'border-color:var(--success);';
                } else {
                    precoHtml = `<div style="color:var(--text);font-weight:800;font-size:20px;margin-top:6px">${formatarPreco(s.preco)}</div>`;
                }
                return `<div class="card-selecao" onclick="selecionarSobremesa(${s.id})" style="${cssExtra}">
                    <div class="card-nome">${s.nome}</div>
                    ${precoHtml}
                </div>`;
            }).join('')}
        </div>
    `;
}

function selecionarSobremesa(sobremesaId) { itemAtual.sobremesa_id = sobremesaId; mostrarEtapaExtras(); }
function pularSobremesa() { itemAtual.sobremesa_id = null; mostrarEtapaExtras(); }

// ============================================
// FLUXO - EXTRAS (opcionais pagos)
// ============================================

async function mostrarEtapaExtras() {
    const produto = itemAtual.produto;
    // Se a categoria não tem extras, pula direto para confirmação
    if (!produto.extras || produto.extras.length === 0) {
        confirmarItem();
        return;
    }

    const area = document.getElementById('area-montagem');
    area.innerHTML = `
        <div class="flex-between mb-20">
            <div>
                <h3 style="font-size:22px;color:var(--primary)">Adicionar extras?</h3>
                <p style="color:var(--text-light)">${produto.nome} &mdash; Itens adicionais com custo extra</p>
            </div>
            <button class="btn btn-outline btn-sm" onclick="mostrarEtapaSobremesa()">Voltar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:16px">
            <div class="opcao-rapida nao" onclick="pularExtras()" style="background:#f5f5f5">
                <strong>Sem extras</strong>
            </div>
        </div>
        <div id="extras-selecionados" class="mb-12" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">
            ${produto.extras.map(e => `
                <div class="opcao-rapida" id="extra-btn-${e.id}" onclick="toggleExtra(${e.id})">
                    ${e.nome}<br><small>${formatarPreco(e.preco)}</small>
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-20">
            <button class="btn btn-success btn-lg" onclick="confirmarItem()">Continuar</button>
        </div>
    `;
}

function toggleExtra(extraId) {
    const idx = itemAtual.extra_ids.indexOf(extraId);
    const btn = document.getElementById(`extra-btn-${extraId}`);
    if (idx >= 0) {
        itemAtual.extra_ids.splice(idx, 1);
        btn.classList.remove('selecionado');
    } else {
        itemAtual.extra_ids.push(extraId);
        btn.classList.add('selecionado');
    }
}

function pularExtras() { itemAtual.extra_ids = []; confirmarItem(); }

// ============================================
// FLUXO - CONFIRMAR ITEM
// ============================================

async function confirmarItem() {
    try {
        const resultado = await API.pedidos.calcularItem({
            produto_id: itemAtual.produto.id,
            acompanhamento_ids: itemAtual.acompanhamento_ids,
            bebida_id: itemAtual.bebida_id,
            sobremesa_id: itemAtual.sobremesa_id,
            extra_ids: itemAtual.extra_ids
        });

        const area = document.getElementById('area-montagem');
        area.innerHTML = `
            <div class="text-center mb-20">
                <h3 style="font-size:22px;color:var(--success)">Confirmar Item</h3>
            </div>
            <div style="max-width:500px;margin:0 auto;background:#f9f9f9;border-radius:12px;padding:24px">
                <div style="font-size:20px;font-weight:700;margin-bottom:12px">${resultado.produto_nome}</div>
                ${itemAtual.produto.acompanhamento_fixo ? `<div style="font-size:14px;color:var(--text-light)">Acompanha: ${itemAtual.produto.acompanhamento_fixo}</div>` : ''}
                ${resultado.acompanhamentos_txt ? `<div style="font-size:16px;color:var(--text-light)">Acomp: ${resultado.acompanhamentos_txt}</div>` : ''}
                ${resultado.bebida_nome ? `<div style="font-size:16px;color:var(--text-light)">Bebida: ${resultado.bebida_nome}</div>` : ''}
                ${resultado.sobremesa_nome ? `<div style="font-size:16px;color:var(--text-light)">Sobremesa: ${resultado.sobremesa_nome}</div>` : ''}
                ${resultado.extras_txt ? `<div style="font-size:16px;color:var(--text-light)">Extras: ${resultado.extras_txt} (+${formatarPreco(resultado.extras_preco)})</div>` : ''}
                ${resultado.combo_aplicado ? `<div style="margin-top:8px"><span class="badge badge-success">COMBO APLICADO (+${formatarPreco(resultado.valor_combo)})</span></div>` : ''}
                <div style="font-size:28px;font-weight:800;color:var(--success);margin-top:16px">${formatarPreco(resultado.subtotal)}</div>
                <div class="form-group mt-12">
                    <label>Observacao do item:</label>
                    <input type="text" class="form-control" id="obs-item" placeholder="Ex: sem cebola, bem passado...">
                </div>
                <div style="display:flex;gap:12px;margin-top:20px">
                    <button class="btn btn-outline" onclick="mostrarEtapaBebida()" style="flex:1">Voltar</button>
                    <button class="btn btn-success btn-lg" onclick="adicionarItemAoPedido()" style="flex:2">Adicionar ao Pedido</button>
                </div>
            </div>
        `;

        itemAtual.resultado = resultado;
    } catch (e) { toast('Erro ao calcular item: ' + e.message, 'erro'); }
}

function adicionarItemAoPedido() {
    const obs = document.getElementById('obs-item').value;
    const item = {
        ...itemAtual.resultado,
        observacao: obs,
        _dados: {
            produto_id: itemAtual.produto.id,
            acompanhamento_ids: itemAtual.acompanhamento_ids,
            bebida_id: itemAtual.bebida_id,
            sobremesa_id: itemAtual.sobremesa_id,
            extra_ids: itemAtual.extra_ids,
            observacao: obs
        }
    };
    pedidoAtual.itens.push(item);
    atualizarCarrinho();
    toast(`${item.produto_nome} adicionado!`);
    mostrarEtapaCategorias();
}

// ============================================
// CARRINHO LATERAL
// ============================================

function removerItemPedido(index) { pedidoAtual.itens.splice(index, 1); atualizarCarrinho(); }

function atualizarCarrinho() {
    const container = document.getElementById('carrinho-itens');
    const totalEl = document.getElementById('carrinho-total');
    const countEl = document.getElementById('carrinho-count');
    const btnFechar = document.getElementById('btn-fechar-pedido');
    if (!container) return;

    const itens = pedidoAtual.itens;
    countEl.textContent = itens.length;

    if (itens.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:40px 20px">Nenhum item no pedido</p>';
        totalEl.textContent = formatarPreco(0);
        btnFechar.disabled = true; btnFechar.style.opacity = '0.5';
        return;
    }
    btnFechar.disabled = false; btnFechar.style.opacity = '1';

    container.innerHTML = itens.map((item, i) => `
        <div class="pedido-item">
            <button class="btn-remover" onclick="removerItemPedido(${i})" title="Remover">&times;</button>
            <div class="item-nome">${item.produto_nome}</div>
            <div class="item-detalhe" style="display:flex;justify-content:space-between"><span>Prato</span><span>${formatarPreco(item.produto_preco)}</span></div>
            ${item.acompanhamentos_txt ? `<div class="item-detalhe">Acomp: ${item.acompanhamentos_txt}</div>` : ''}
            ${item.bebida_nome ? `<div class="item-detalhe" style="display:flex;justify-content:space-between"><span>Bebida: ${item.bebida_nome}${item.bebida_especial ? ' <span class="badge badge-success" style="font-size:10px">PROMO</span>' : ''}</span><span>${formatarPreco(item.bebida_preco)}</span></div>` : ''}
            ${item.sobremesa_nome ? `<div class="item-detalhe" style="display:flex;justify-content:space-between"><span>Sobremesa: ${item.sobremesa_nome}</span><span>${formatarPreco(item.sobremesa_preco)}</span></div>` : ''}
            ${item.extras_txt ? `<div class="item-detalhe" style="display:flex;justify-content:space-between"><span>Extras: ${item.extras_txt}</span><span>${formatarPreco(item.extras_preco)}</span></div>` : ''}
            ${item.combo_aplicado ? `<div class="item-detalhe" style="display:flex;justify-content:space-between"><span class="item-combo-badge">COMBO</span><span style="color:var(--success);font-weight:700">+${formatarPreco(item.valor_combo)}</span></div>` : ''}
            ${item.observacao ? `<div class="item-detalhe" style="font-style:italic">Obs: ${item.observacao}</div>` : ''}
            <div class="item-preco" style="border-top:1px dashed var(--border);padding-top:6px;margin-top:6px">${formatarPreco(item.subtotal)}</div>
        </div>
    `).join('');

    totalEl.textContent = formatarPreco(itens.reduce((s, i) => s + i.subtotal, 0));
}

// ============================================
// FECHAR E CONFIRMAR PEDIDO
// ============================================

function fecharPedido() {
    if (pedidoAtual.itens.length === 0) { toast('Adicione itens ao pedido', 'aviso'); return; }
    const total = pedidoAtual.itens.reduce((s, i) => s + i.subtotal, 0);
    const area = document.getElementById('area-montagem');
    area.innerHTML = `
        <div class="text-center mb-20"><h3 style="font-size:24px;color:var(--primary)">Fechar Pedido</h3></div>
        <div style="max-width:600px;margin:0 auto">
            <div style="background:#f9f9f9;border-radius:12px;padding:24px;margin-bottom:20px">
                <h4 style="margin-bottom:16px">Resumo do Pedido</h4>
                ${pedidoAtual.itens.map(item => `
                    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
                        <div style="font-size:17px;font-weight:700;margin-bottom:4px">${item.produto_nome}${item.combo_aplicado ? ' <span class="badge badge-success">COMBO</span>' : ''}</div>
                        <div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-light)"><span>Prato</span><span>${formatarPreco(item.produto_preco)}</span></div>
                        ${item.acompanhamentos_txt ? `<div style="font-size:14px;color:var(--text-light)">Acomp: ${item.acompanhamentos_txt}</div>` : ''}
                        ${item.bebida_nome ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-light)"><span>Bebida: ${item.bebida_nome}${item.bebida_especial ? ' <span class="badge badge-success" style="font-size:10px">PROMO</span>' : ''}</span><span>${item.combo_aplicado ? 'incluso' : formatarPreco(item.bebida_preco)}</span></div>` : ''}
                        ${item.sobremesa_nome ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-light)"><span>Sobremesa: ${item.sobremesa_nome}</span><span>${item.combo_aplicado ? 'incluso' : formatarPreco(item.sobremesa_preco)}</span></div>` : ''}
                        ${item.extras_txt ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-light)"><span>Extras: ${item.extras_txt}</span><span>${formatarPreco(item.extras_preco)}</span></div>` : ''}
                        ${item.combo_aplicado ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:var(--success)"><span>Adicional combo</span><span>+${formatarPreco(item.valor_combo)}</span></div>` : ''}
                        ${item.observacao ? `<div style="font-size:13px;font-style:italic;color:var(--text-light)">Obs: ${item.observacao}</div>` : ''}
                        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;margin-top:4px;padding-top:4px;border-top:1px dashed var(--border)"><span>Subtotal</span><span>${formatarPreco(item.subtotal)}</span></div>
                    </div>
                `).join('')}
                <div style="display:flex;justify-content:space-between;padding:16px 0 0;font-size:24px;font-weight:800">
                    <div>TOTAL</div>
                    <div style="color:var(--success)">${formatarPreco(total)}</div>
                </div>
            </div>
            <div style="background:var(--primary);border-radius:12px;padding:24px;margin-bottom:20px;text-align:center">
                <label style="color:#fff;font-size:22px;font-weight:700;display:block;margin-bottom:12px">INFORME O NUMERO DO PAGER</label>
                <input type="number" class="form-control" id="pager-pedido" placeholder="?" min="1" autofocus
                    oninput="validarPager()"
                    style="font-size:48px;font-weight:800;text-align:center;max-width:220px;margin:0 auto;border:3px solid #fff;border-radius:12px">
                <p id="pager-erro" style="color:#ffcdd2;font-size:14px;margin-top:8px;display:none">Obrigatorio informar o pager</p>
            </div>
            <div class="form-group">
                <label>Observacao geral do pedido:</label>
                <textarea class="form-control" id="obs-pedido" rows="2" placeholder="Ex: cliente VIP, sem pressa..."></textarea>
            </div>
            <div style="display:flex;gap:12px">
                <button class="btn btn-outline btn-lg" onclick="mostrarEtapaCategorias()" style="flex:1">Continuar Pedido</button>
                <button class="btn btn-success btn-lg" id="btn-confirmar-pedido" onclick="confirmarPedido()" style="flex:2;opacity:0.4" disabled>Confirmar e Imprimir</button>
            </div>
        </div>
    `;
}

function validarPager() {
    const val = parseInt(document.getElementById('pager-pedido').value) || 0;
    const btn = document.getElementById('btn-confirmar-pedido');
    const erro = document.getElementById('pager-erro');
    if (val > 0) {
        btn.disabled = false;
        btn.style.opacity = '1';
        erro.style.display = 'none';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.4';
    }
}

async function confirmarPedido() {
    const pager = parseInt(document.getElementById('pager-pedido').value) || 0;
    if (pager <= 0) {
        document.getElementById('pager-erro').style.display = 'block';
        document.getElementById('pager-pedido').focus();
        toast('Informe o numero do pager', 'aviso');
        return;
    }
    const obs = document.getElementById('obs-pedido').value;
    try {
        const resultado = await API.pedidos.criar({
            itens: pedidoAtual.itens.map(item => item._dados),
            observacao: obs,
            pager: pager
        });
        const pagerTxt = resultado.pedido.pager ? resultado.pedido.pager : '';
        const area = document.getElementById('area-montagem');
        area.innerHTML = `
            <div class="sucesso-pedido">
                <h2>Pedido Criado!</h2>
                <div class="numero-pedido">#${String(resultado.pedido.numero).padStart(3, '0')}</div>
                ${pagerTxt ? `<div style="font-size:36px;font-weight:800;color:var(--primary);margin:8px 0;background:#fde8e8;display:inline-block;padding:8px 32px;border-radius:12px">PAGER: ${pagerTxt}</div>` : ''}
                <p style="font-size:18px;margin-bottom:8px">Total: <strong style="color:var(--success)">${formatarPreco(resultado.pedido.total)}</strong></p>
                <div style="margin:20px 0">
                    ${resultado.impressao?.caixa?.sucesso ? '<span class="badge badge-success" style="margin:4px">Caixa: impresso</span>' : '<span class="badge badge-warning" style="margin:4px">Caixa: simulacao</span>'}
                    ${resultado.impressao?.cozinha?.sucesso ? '<span class="badge badge-success" style="margin:4px">Cozinha: impresso</span>' : '<span class="badge badge-warning" style="margin:4px">Cozinha: simulacao</span>'}
                </div>
                <div style="display:flex;gap:12px;justify-content:center;margin-top:30px">
                    <button class="btn btn-primary btn-lg" onclick="novoPedido()">Novo Pedido</button>
                    <button class="btn btn-outline" onclick="reimprimir(${resultado.pedido.id})">Reimprimir</button>
                </div>
            </div>
        `;
        pedidoAtual = { itens: [], observacao: '' };
        atualizarCarrinho();
    } catch (e) { toast('Erro ao criar pedido: ' + e.message, 'erro'); }
}

function novoPedido() { pedidoAtual = { itens: [], observacao: '' }; atualizarCarrinho(); mostrarEtapaCategorias(); }

async function reimprimir(pedidoId) {
    try { await API.pedidos.reimprimir(pedidoId, 'ambos'); toast('Reimpressao solicitada'); }
    catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

// ============================================
// PEDIDOS DO DIA
// ============================================

async function carregarPedidosDia() {
    const container = document.getElementById('lista-pedidos-dia');
    if (!container) return;
    try {
        const pedidos = await API.pedidos.listar();
        if (pedidos.length === 0) { container.innerHTML = '<p class="text-center" style="padding:40px;color:var(--text-light)">Nenhum pedido hoje</p>'; return; }
        const totalDia = pedidos.reduce((s, p) => s + p.total, 0);
        container.innerHTML = `
        <div style="display:flex;gap:16px;margin-bottom:20px">
            <div style="background:var(--bg-card);border-radius:12px;padding:20px 28px;box-shadow:var(--shadow);flex:1;text-align:center">
                <div style="font-size:14px;color:var(--text-light);font-weight:600">Pedidos</div>
                <div style="font-size:32px;font-weight:800;color:var(--text)">${pedidos.length}</div>
            </div>
            <div style="background:var(--bg-card);border-radius:12px;padding:20px 28px;box-shadow:var(--shadow);flex:2;text-align:center">
                <div style="font-size:14px;color:var(--text-light);font-weight:600">Total do Dia</div>
                <div style="font-size:32px;font-weight:800;color:var(--success)">${formatarPreco(totalDia)}</div>
            </div>
        </div>
        <div class="table-container"><table>
            <thead><tr><th>#</th><th>Pager</th><th>Hora</th><th>Total</th><th>Status</th><th>Impresso</th><th>Acoes</th></tr></thead>
            <tbody>${pedidos.map(p => `<tr>
                <td><strong>${String(p.numero).padStart(3, '0')}</strong></td>
                <td>${p.pager ? `<strong style="color:var(--primary)">${p.pager}</strong>` : '-'}</td>
                <td>${p.data_hora ? p.data_hora.split(' ')[1] || p.data_hora : '-'}</td>
                <td><strong>${formatarPreco(p.total)}</strong></td>
                <td><span class="badge badge-success">${p.status}</span></td>
                <td>${p.impresso_caixa ? '<span class="badge badge-success">Cx</span>' : '<span class="badge badge-warning">Cx</span>'} ${p.impresso_cozinha ? '<span class="badge badge-success">Coz</span>' : '<span class="badge badge-warning">Coz</span>'}</td>
                <td><button class="btn btn-sm btn-outline" onclick="verDetalhesPedido(${p.id})">Ver</button> <button class="btn btn-sm btn-secondary" onclick="reimprimir(${p.id})">Reimprimir</button></td>
            </tr>`).join('')}</tbody></table></div>`;
    } catch (e) { toast('Erro ao carregar pedidos', 'erro'); }
}

async function verDetalhesPedido(id) {
    try {
        const data = await API.pedidos.obter(id);
        const p = data.pedido, itens = data.itens;
        document.getElementById('modal-container').innerHTML = `
            <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal" onclick="event.stopPropagation()">
                <h3>Pedido #${String(p.numero).padStart(3, '0')}</h3>
                ${p.pager ? `<p style="font-size:20px;font-weight:800;color:var(--primary)">PAGER: ${p.pager}</p>` : ''}
                <p><strong>Data:</strong> ${p.data_hora}</p>
                ${p.observacao ? `<p><strong>Obs:</strong> ${p.observacao}</p>` : ''}
                <hr style="margin:16px 0">
                ${itens.map(item => `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
                    <div class="flex-between"><strong>${item.produto_nome}</strong><span>${formatarPreco(item.subtotal)}</span></div>
                    ${item.acompanhamentos_txt ? `<small>Acomp: ${item.acompanhamentos_txt}</small><br>` : ''}
                    ${item.bebida_nome ? `<small>Bebida: ${item.bebida_nome}</small><br>` : ''}
                    ${item.sobremesa_nome ? `<small>Sobremesa: ${item.sobremesa_nome}</small><br>` : ''}
                    ${item.extras_txt ? `<small>Extras: ${item.extras_txt}</small><br>` : ''}
                    ${item.combo_aplicado ? '<span class="badge badge-success">COMBO</span>' : ''}
                    ${item.observacao ? `<br><small style="font-style:italic">Obs: ${item.observacao}</small>` : ''}
                </div>`).join('')}
                <div style="font-size:22px;font-weight:800;text-align:right;margin-top:16px">Total: <span style="color:var(--success)">${formatarPreco(p.total)}</span></div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="reimprimir(${p.id}); fecharModalForce()">Reimprimir</button>
                    <button class="btn btn-outline" onclick="fecharModalForce()">Fechar</button>
                </div>
            </div></div>`;
    } catch (e) { toast('Erro ao carregar detalhes', 'erro'); }
}

// ============================================
// CRUD - CATEGORIAS
// ============================================

async function carregarCadastroCategorias() {
    const container = document.getElementById('lista-categorias');
    if (!container) return;
    try {
        const [categorias, extras] = await Promise.all([API.categorias.listar(), API.extras.listar()]);
        const divExtras = document.getElementById('cat-extras');
        if (divExtras) divExtras.innerHTML = extras.map(e => `<div class="form-check"><input type="checkbox" id="cat-extra-${e.id}" value="${e.id}"><label for="cat-extra-${e.id}">${e.nome} (${formatarPreco(e.preco)})</label></div>`).join('');
        container.innerHTML = `<div class="table-container"><table>
            <thead><tr><th>Nome</th><th>Ordem</th><th>Qtd Acomp</th><th>Fixo</th><th>Acoes</th></tr></thead>
            <tbody>${categorias.map(c => `<tr>
                <td><strong>${c.nome}</strong></td><td>${c.ordem}</td><td>${c.qtd_acompanhamentos}</td>
                <td><small>${c.acompanhamento_fixo || '-'}</small></td>
                <td><button class="btn btn-sm btn-outline" onclick="editarCategoria(${c.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirCategoria(${c.id})">Excluir</button></td>
            </tr>`).join('')}</tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}

async function salvarCategoria() {
    const id = document.getElementById('cat-id').value;
    const data = {
        nome: document.getElementById('cat-nome').value,
        ordem: parseInt(document.getElementById('cat-ordem').value) || 0,
        qtd_acompanhamentos: parseInt(document.getElementById('cat-qtd-acomp').value) || 0,
        acompanhamento_label: document.getElementById('cat-acomp-label').value || 'Escolha o acompanhamento',
        acompanhamento_fixo: document.getElementById('cat-acomp-fixo').value || '',
        preco_bebida_especial: parseFloat(document.getElementById('cat-bebida-especial').value) || 0,
        extra_ids: []
    };
    document.querySelectorAll('#cat-extras input:checked').forEach(cb => data.extra_ids.push(parseInt(cb.value)));
    if (!data.nome) { toast('Informe o nome', 'aviso'); return; }
    try {
        if (id) { await API.categorias.atualizar(id, data); toast('Atualizada'); }
        else { await API.categorias.criar(data); toast('Criada'); }
        limparFormCategoria(); carregarCadastroCategorias();
    } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function editarCategoria(id) {
    try {
        const cats = await API.categorias.listar();
        const c = cats.find(x => x.id === id); if (!c) return;
        document.getElementById('cat-id').value = c.id;
        document.getElementById('cat-nome').value = c.nome;
        document.getElementById('cat-ordem').value = c.ordem;
        document.getElementById('cat-qtd-acomp').value = c.qtd_acompanhamentos;
        document.getElementById('cat-acomp-label').value = c.acompanhamento_label || '';
        document.getElementById('cat-acomp-fixo').value = c.acompanhamento_fixo || '';
        document.getElementById('cat-bebida-especial').value = c.preco_bebida_especial || 0;
        document.querySelectorAll('#cat-extras input').forEach(cb => cb.checked = false);
        if (c.extras) c.extras.forEach(e => { const cb = document.getElementById(`cat-extra-${e.id}`); if (cb) cb.checked = true; });
        document.getElementById('cat-nome').focus();
    } catch (e) { toast('Erro', 'erro'); }
}

function limparFormCategoria() {
    ['cat-id', 'cat-nome', 'cat-acomp-fixo'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('cat-ordem').value = '0';
    document.getElementById('cat-qtd-acomp').value = '0';
    document.getElementById('cat-acomp-label').value = 'Escolha o acompanhamento';
    document.getElementById('cat-bebida-especial').value = '0';
    document.querySelectorAll('#cat-extras input').forEach(cb => cb.checked = false);
}

async function excluirCategoria(id) {
    if (!confirm('Desativar esta categoria?')) return;
    try { await API.categorias.excluir(id); toast('Desativada'); carregarCadastroCategorias(); } catch (e) { toast('Erro', 'erro'); }
}

// ============================================
// CRUD - PRODUTOS
// ============================================

async function carregarCadastroProdutos() {
    const container = document.getElementById('lista-produtos');
    if (!container) return;
    try {
        const [produtos, categorias, acompanhamentos, regras] = await Promise.all([
            API.produtos.listar(), API.categorias.listar(), API.acompanhamentos.listar(), API.regrasCombo.listar()
        ]);
        document.getElementById('prod-categoria').innerHTML = '<option value="">Selecione...</option>' + categorias.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
        document.getElementById('prod-regra-combo').innerHTML = '<option value="">Nenhuma</option>' + regras.map(r => `<option value="${r.id}">${r.nome} (+${formatarPreco(r.valor_adicional)})</option>`).join('');
        document.getElementById('prod-acompanhamentos').innerHTML = acompanhamentos.map(a => `<div class="form-check"><input type="checkbox" id="acomp-${a.id}" value="${a.id}"><label for="acomp-${a.id}">${a.nome}</label></div>`).join('');
        container.innerHTML = `<div class="table-container"><table>
            <thead><tr><th>Produto</th><th>Categoria</th><th>Preco</th><th>Combo</th><th>Acoes</th></tr></thead>
            <tbody>${produtos.map(p => `<tr>
                <td><strong>${p.nome}</strong></td><td>${p.categoria_nome}</td><td>${formatarPreco(p.preco)}</td>
                <td>${p.tem_combo && p.regra_combo ? `<span class="badge badge-success">+${formatarPreco(p.regra_combo.valor_adicional)}</span>` : '-'}</td>
                <td><button class="btn btn-sm btn-outline" onclick="editarProduto(${p.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirProduto(${p.id})">Excluir</button></td>
            </tr>`).join('')}</tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}

async function salvarProduto() {
    const id = document.getElementById('prod-id').value;
    const data = {
        categoria_id: parseInt(document.getElementById('prod-categoria').value),
        nome: document.getElementById('prod-nome').value,
        descricao: document.getElementById('prod-descricao').value,
        preco: parseFloat(document.getElementById('prod-preco').value) || 0,
        tem_combo: document.getElementById('prod-tem-combo').checked ? 1 : 0,
        ordem: parseInt(document.getElementById('prod-ordem').value) || 0,
        acompanhamento_ids: [],
        regra_combo_id: parseInt(document.getElementById('prod-regra-combo').value) || null
    };
    document.querySelectorAll('#prod-acompanhamentos input:checked').forEach(cb => data.acompanhamento_ids.push(parseInt(cb.value)));
    if (!data.nome || !data.categoria_id) { toast('Preencha nome e categoria', 'aviso'); return; }
    try {
        if (id) { await API.produtos.atualizar(id, data); toast('Atualizado'); }
        else { await API.produtos.criar(data); toast('Criado'); }
        limparFormProduto(); carregarCadastroProdutos();
    } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function editarProduto(id) {
    try {
        const p = await API.produtos.obter(id);
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-categoria').value = p.categoria_id;
        document.getElementById('prod-nome').value = p.nome;
        document.getElementById('prod-descricao').value = p.descricao || '';
        document.getElementById('prod-preco').value = p.preco;
        document.getElementById('prod-tem-combo').checked = p.tem_combo;
        document.getElementById('prod-ordem').value = p.ordem;
        document.getElementById('prod-regra-combo').value = p.regra_combo ? p.regra_combo.id : '';
        document.querySelectorAll('#prod-acompanhamentos input').forEach(cb => cb.checked = false);
        if (p.acompanhamentos) p.acompanhamentos.forEach(a => { const cb = document.getElementById(`acomp-${a.id}`); if (cb) cb.checked = true; });
        document.getElementById('prod-nome').focus();
    } catch (e) { toast('Erro', 'erro'); }
}

function limparFormProduto() {
    ['prod-id', 'prod-nome', 'prod-descricao'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('prod-categoria').value = '';
    document.getElementById('prod-preco').value = '';
    document.getElementById('prod-ordem').value = '0';
    document.getElementById('prod-regra-combo').value = '';
    document.getElementById('prod-tem-combo').checked = true;
    document.querySelectorAll('#prod-acompanhamentos input').forEach(cb => cb.checked = false);
}

async function excluirProduto(id) {
    if (!confirm('Desativar?')) return;
    try { await API.produtos.excluir(id); toast('Desativado'); carregarCadastroProdutos(); } catch (e) { toast('Erro', 'erro'); }
}

// ============================================
// CRUD SIMPLES - Acompanhamentos, Bebidas, Sobremesas, Extras
// ============================================

// --- Acompanhamentos ---
async function carregarCadastroAcompanhamentos() {
    const c = document.getElementById('lista-acompanhamentos'); if (!c) return;
    try {
        const items = await API.acompanhamentos.listar();
        c.innerHTML = `<div class="table-container"><table><thead><tr><th>Nome</th><th>Acoes</th></tr></thead><tbody>
            ${items.map(a => `<tr><td><strong>${a.nome}</strong></td><td><button class="btn btn-sm btn-outline" onclick="editarAcompanhamento(${a.id}, '${a.nome.replace(/'/g, "\\'")}')">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirAcompanhamento(${a.id})">Excluir</button></td></tr>`).join('')}
        </tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}
async function salvarAcompanhamento() {
    const id = document.getElementById('acomp-id').value, nome = document.getElementById('acomp-nome').value;
    if (!nome) { toast('Informe o nome', 'aviso'); return; }
    try {
        if (id) await API.acompanhamentos.atualizar(id, { nome }); else await API.acompanhamentos.criar({ nome });
        toast(id ? 'Atualizado' : 'Criado');
        document.getElementById('acomp-id').value = ''; document.getElementById('acomp-nome').value = '';
        carregarCadastroAcompanhamentos();
    } catch (e) { toast('Erro', 'erro'); }
}
function editarAcompanhamento(id, nome) { document.getElementById('acomp-id').value = id; document.getElementById('acomp-nome').value = nome; document.getElementById('acomp-nome').focus(); }
async function excluirAcompanhamento(id) { if (!confirm('Desativar?')) return; try { await API.acompanhamentos.excluir(id); toast('Desativado'); carregarCadastroAcompanhamentos(); } catch (e) { toast('Erro', 'erro'); } }

// --- Bebidas ---
async function carregarCadastroBebidas() {
    const c = document.getElementById('lista-bebidas'); if (!c) return;
    try {
        const items = await API.bebidas.listar();
        c.innerHTML = `<div class="table-container"><table><thead><tr><th>Nome</th><th>Preco</th><th>Combo</th><th>Especial</th><th>Acoes</th></tr></thead><tbody>
            ${items.map(b => `<tr><td><strong>${b.nome}</strong></td><td>${formatarPreco(b.preco)}</td><td>${b.participa_combo ? '<span class="badge badge-success">Sim</span>' : '<span class="badge badge-danger">Nao</span>'}</td><td>${b.participa_especial ? '<span class="badge badge-success">R$3</span>' : '-'}</td><td><button class="btn btn-sm btn-outline" onclick="editarBebida(${b.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirBebida(${b.id})">Excluir</button></td></tr>`).join('')}
        </tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}
async function salvarBebida() {
    const id = document.getElementById('beb-id').value;
    const data = { nome: document.getElementById('beb-nome').value, preco: parseFloat(document.getElementById('beb-preco').value) || 0, participa_combo: document.getElementById('beb-combo').checked ? 1 : 0, participa_especial: document.getElementById('beb-especial').checked ? 1 : 0, ordem: parseInt(document.getElementById('beb-ordem').value) || 0 };
    if (!data.nome) { toast('Informe o nome', 'aviso'); return; }
    try {
        if (id) await API.bebidas.atualizar(id, data); else await API.bebidas.criar(data);
        toast(id ? 'Atualizada' : 'Criada'); limparFormBebida(); carregarCadastroBebidas();
    } catch (e) { toast('Erro', 'erro'); }
}
async function editarBebida(id) { const items = await API.bebidas.listar(); const b = items.find(x => x.id === id); if (!b) return; document.getElementById('beb-id').value = b.id; document.getElementById('beb-nome').value = b.nome; document.getElementById('beb-preco').value = b.preco; document.getElementById('beb-combo').checked = b.participa_combo; document.getElementById('beb-especial').checked = b.participa_especial; document.getElementById('beb-ordem').value = b.ordem; }
function limparFormBebida() { ['beb-id', 'beb-nome', 'beb-preco'].forEach(id => document.getElementById(id).value = ''); document.getElementById('beb-combo').checked = false; document.getElementById('beb-especial').checked = false; document.getElementById('beb-ordem').value = '0'; }
async function excluirBebida(id) { if (!confirm('Desativar?')) return; try { await API.bebidas.excluir(id); toast('Desativada'); carregarCadastroBebidas(); } catch (e) { toast('Erro', 'erro'); } }

// --- Sobremesas ---
async function carregarCadastroSobremesas() {
    const c = document.getElementById('lista-sobremesas'); if (!c) return;
    try {
        const items = await API.sobremesas.listar();
        c.innerHTML = `<div class="table-container"><table><thead><tr><th>Nome</th><th>Preco</th><th>Combo</th><th>Acoes</th></tr></thead><tbody>
            ${items.map(s => `<tr><td><strong>${s.nome}</strong></td><td>${formatarPreco(s.preco)}</td><td>${s.participa_combo ? '<span class="badge badge-success">Sim</span>' : '<span class="badge badge-danger">Nao</span>'}</td><td><button class="btn btn-sm btn-outline" onclick="editarSobremesa(${s.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirSobremesa(${s.id})">Excluir</button></td></tr>`).join('')}
        </tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}
async function salvarSobremesa() {
    const id = document.getElementById('sob-id').value;
    const data = { nome: document.getElementById('sob-nome').value, preco: parseFloat(document.getElementById('sob-preco').value) || 0, participa_combo: document.getElementById('sob-combo').checked ? 1 : 0, ordem: parseInt(document.getElementById('sob-ordem').value) || 0 };
    if (!data.nome) { toast('Informe o nome', 'aviso'); return; }
    try {
        if (id) await API.sobremesas.atualizar(id, data); else await API.sobremesas.criar(data);
        toast(id ? 'Atualizada' : 'Criada'); limparFormSobremesa(); carregarCadastroSobremesas();
    } catch (e) { toast('Erro', 'erro'); }
}
async function editarSobremesa(id) { const items = await API.sobremesas.listar(); const s = items.find(x => x.id === id); if (!s) return; document.getElementById('sob-id').value = s.id; document.getElementById('sob-nome').value = s.nome; document.getElementById('sob-preco').value = s.preco; document.getElementById('sob-combo').checked = s.participa_combo; document.getElementById('sob-ordem').value = s.ordem; }
function limparFormSobremesa() { ['sob-id', 'sob-nome', 'sob-preco'].forEach(id => document.getElementById(id).value = ''); document.getElementById('sob-combo').checked = false; document.getElementById('sob-ordem').value = '0'; }
async function excluirSobremesa(id) { if (!confirm('Desativar?')) return; try { await API.sobremesas.excluir(id); toast('Desativada'); carregarCadastroSobremesas(); } catch (e) { toast('Erro', 'erro'); } }

// --- Extras ---
async function carregarCadastroExtras() {
    const c = document.getElementById('lista-extras'); if (!c) return;
    try {
        const items = await API.extras.listar();
        c.innerHTML = `<div class="table-container"><table><thead><tr><th>Nome</th><th>Preco</th><th>Acoes</th></tr></thead><tbody>
            ${items.map(e => `<tr><td><strong>${e.nome}</strong></td><td>${formatarPreco(e.preco)}</td><td><button class="btn btn-sm btn-outline" onclick="editarExtra(${e.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirExtra(${e.id})">Excluir</button></td></tr>`).join('')}
        </tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}
async function salvarExtra() {
    const id = document.getElementById('ext-id').value;
    const data = { nome: document.getElementById('ext-nome').value, preco: parseFloat(document.getElementById('ext-preco').value) || 0, ordem: parseInt(document.getElementById('ext-ordem').value) || 0 };
    if (!data.nome) { toast('Informe o nome', 'aviso'); return; }
    try {
        if (id) await API.extras.atualizar(id, data); else await API.extras.criar(data);
        toast(id ? 'Atualizado' : 'Criado'); document.getElementById('ext-id').value = ''; document.getElementById('ext-nome').value = ''; document.getElementById('ext-preco').value = ''; document.getElementById('ext-ordem').value = '0'; carregarCadastroExtras();
    } catch (e) { toast('Erro', 'erro'); }
}
async function editarExtra(id) { const items = await API.extras.listar(); const e = items.find(x => x.id === id); if (!e) return; document.getElementById('ext-id').value = e.id; document.getElementById('ext-nome').value = e.nome; document.getElementById('ext-preco').value = e.preco; document.getElementById('ext-ordem').value = e.ordem; }
async function excluirExtra(id) { if (!confirm('Desativar?')) return; try { await API.extras.excluir(id); toast('Desativado'); carregarCadastroExtras(); } catch (e) { toast('Erro', 'erro'); } }

// ============================================
// REGRAS DE COMBO
// ============================================

async function carregarRegrasCombo() {
    const c = document.getElementById('lista-regras-combo'); if (!c) return;
    try {
        const [regras, produtos] = await Promise.all([API.regrasCombo.listar(), API.produtos.listar()]);
        document.getElementById('regra-produtos').innerHTML = produtos.map(p => `<div class="form-check"><input type="checkbox" id="regra-prod-${p.id}" value="${p.id}"><label for="regra-prod-${p.id}">${p.nome} (${p.categoria_nome})</label></div>`).join('');
        c.innerHTML = `<div class="table-container"><table>
            <thead><tr><th>Nome</th><th>Valor Adicional</th><th>Exige Bebida</th><th>Exige Sobremesa</th><th>Produtos</th><th>Acoes</th></tr></thead>
            <tbody>${regras.map(r => `<tr>
                <td><strong>${r.nome}</strong></td><td>${formatarPreco(r.valor_adicional)}</td>
                <td>${r.exige_bebida ? 'Sim' : 'Nao'}</td><td>${r.exige_sobremesa ? 'Sim' : 'Nao'}</td>
                <td><small>${r.produtos ? r.produtos.map(p => p.nome).join(', ') : '-'}</small></td>
                <td><button class="btn btn-sm btn-outline" onclick="editarRegraCombo(${r.id})">Editar</button> <button class="btn btn-sm btn-danger" onclick="excluirRegraCombo(${r.id})">Excluir</button></td>
            </tr>`).join('')}</tbody></table></div>`;
    } catch (e) { toast('Erro', 'erro'); }
}
async function salvarRegraCombo() {
    const id = document.getElementById('regra-id').value;
    const data = { nome: document.getElementById('regra-nome').value, descricao: document.getElementById('regra-descricao').value, valor_adicional: parseFloat(document.getElementById('regra-valor').value) || 10.90, exige_bebida: document.getElementById('regra-exige-bebida').checked ? 1 : 0, exige_sobremesa: document.getElementById('regra-exige-sobremesa').checked ? 1 : 0, produto_ids: [] };
    document.querySelectorAll('#regra-produtos input:checked').forEach(cb => data.produto_ids.push(parseInt(cb.value)));
    if (!data.nome) { toast('Informe o nome', 'aviso'); return; }
    try { if (id) await API.regrasCombo.atualizar(id, data); else await API.regrasCombo.criar(data); toast(id ? 'Atualizada' : 'Criada'); limparFormRegraCombo(); carregarRegrasCombo(); } catch (e) { toast('Erro', 'erro'); }
}
async function editarRegraCombo(id) { const regras = await API.regrasCombo.listar(); const r = regras.find(x => x.id === id); if (!r) return; document.getElementById('regra-id').value = r.id; document.getElementById('regra-nome').value = r.nome; document.getElementById('regra-descricao').value = r.descricao || ''; document.getElementById('regra-valor').value = r.valor_adicional; document.getElementById('regra-exige-bebida').checked = r.exige_bebida; document.getElementById('regra-exige-sobremesa').checked = r.exige_sobremesa; document.querySelectorAll('#regra-produtos input').forEach(cb => cb.checked = false); if (r.produtos) r.produtos.forEach(p => { const cb = document.getElementById(`regra-prod-${p.id}`); if (cb) cb.checked = true; }); }
function limparFormRegraCombo() { ['regra-id', 'regra-nome', 'regra-descricao'].forEach(id => document.getElementById(id).value = ''); document.getElementById('regra-valor').value = '10.90'; document.getElementById('regra-exige-bebida').checked = true; document.getElementById('regra-exige-sobremesa').checked = true; document.querySelectorAll('#regra-produtos input').forEach(cb => cb.checked = false); }
async function excluirRegraCombo(id) { if (!confirm('Desativar?')) return; try { await API.regrasCombo.excluir(id); toast('Desativada'); carregarRegrasCombo(); } catch (e) { toast('Erro', 'erro'); } }

// ============================================
// IMPRESSORAS / CONFIG
// ============================================

async function carregarImpressoras() {
    const c = document.getElementById('lista-impressoras'); if (!c) return;
    try {
        const [impressoras, configs] = await Promise.all([API.impressoras.listar(), API.configuracoes.listar()]);
        document.getElementById('cfg-nome-restaurante').value = configs.nome_restaurante || '';
        document.getElementById('cfg-simulacao').checked = configs.modo_simulacao_impressora === '1';
        c.innerHTML = impressoras.length === 0 ? '<p style="color:var(--text-light);padding:20px">Nenhuma impressora</p>' :
            impressoras.map(imp => `<div class="impressora-card ${imp.ativo ? 'ativa' : ''}">
                <div class="flex-between"><div><strong>${imp.nome}</strong> <span class="badge ${imp.tipo === 'caixa' ? 'badge-info' : 'badge-warning'}">${imp.tipo}</span> <span class="badge badge-success">${imp.conexao}</span></div>
                <div class="flex gap-8"><button class="btn btn-sm btn-outline" onclick="editarImpressora(${imp.id})">Editar</button><button class="btn btn-sm btn-danger" onclick="excluirImpressora(${imp.id})">Remover</button></div></div>
                <div style="margin-top:8px;font-size:13px;color:var(--text-light)">${imp.conexao === 'rede' ? `IP: ${imp.endereco}:${imp.porta}` : `USB: ${imp.vendor_id}:${imp.product_id}`}</div>
            </div>`).join('');
    } catch (e) { toast('Erro', 'erro'); }
}
async function salvarImpressora() {
    const id = document.getElementById('imp-id').value;
    const data = { nome: document.getElementById('imp-nome').value, tipo: document.getElementById('imp-tipo').value, conexao: document.getElementById('imp-conexao').value, endereco: document.getElementById('imp-endereco').value, porta: parseInt(document.getElementById('imp-porta').value) || 9100, vendor_id: document.getElementById('imp-vendor').value, product_id: document.getElementById('imp-product').value };
    if (!data.nome) { toast('Informe o nome', 'aviso'); return; }
    try { if (id) await API.impressoras.atualizar(id, data); else await API.impressoras.criar(data); toast(id ? 'Atualizada' : 'Cadastrada'); limparFormImpressora(); carregarImpressoras(); } catch (e) { toast('Erro', 'erro'); }
}
async function editarImpressora(id) { const items = await API.impressoras.listar(); const imp = items.find(x => x.id === id); if (!imp) return; document.getElementById('imp-id').value = imp.id; document.getElementById('imp-nome').value = imp.nome; document.getElementById('imp-tipo').value = imp.tipo; document.getElementById('imp-conexao').value = imp.conexao; document.getElementById('imp-endereco').value = imp.endereco; document.getElementById('imp-porta').value = imp.porta; document.getElementById('imp-vendor').value = imp.vendor_id; document.getElementById('imp-product').value = imp.product_id; }
function limparFormImpressora() { ['imp-id', 'imp-nome', 'imp-endereco', 'imp-vendor', 'imp-product'].forEach(id => document.getElementById(id).value = ''); document.getElementById('imp-tipo').value = 'caixa'; document.getElementById('imp-conexao').value = 'usb'; document.getElementById('imp-porta').value = '9100'; }
async function excluirImpressora(id) { if (!confirm('Remover?')) return; try { await API.impressoras.excluir(id); toast('Removida'); carregarImpressoras(); } catch (e) { toast('Erro', 'erro'); } }
async function salvarConfiguracoes() { try { await API.configuracoes.salvar({ nome_restaurante: document.getElementById('cfg-nome-restaurante').value, modo_simulacao_impressora: document.getElementById('cfg-simulacao').checked ? '1' : '0' }); toast('Configuracoes salvas'); } catch (e) { toast('Erro', 'erro'); } }

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-nav a[data-pagina]').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); navegarPara(link.dataset.pagina); });
    });
    atualizarMenuAdmin();
    navegarPara('novo-pedido');
});
