/**
 * Módulo de comunicação com a API - v3
 * Rotas admin enviam X-Admin-Senha no header.
 */

// Senha admin armazenada na sessão do browser
let _senhaAdmin = sessionStorage.getItem('admin_senha') || '';

function setSenhaAdmin(s) { _senhaAdmin = s; sessionStorage.setItem('admin_senha', s); }
function getSenhaAdmin() { return _senhaAdmin; }
function limparSenhaAdmin() { _senhaAdmin = ''; sessionStorage.removeItem('admin_senha'); }

const API = {
    async get(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        return res.json();
    },

    // Post sem auth (pedidos, calcular-item)
    async post(url, data) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`);
        return json;
    },

    // Post com auth admin
    async postAdmin(url, data) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Senha': _senhaAdmin }, body: JSON.stringify(data) });
        const json = await res.json();
        if (res.status === 403) { limparSenhaAdmin(); throw new Error('Senha incorreta'); }
        if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`);
        return json;
    },

    async putAdmin(url, data) {
        const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Admin-Senha': _senhaAdmin }, body: JSON.stringify(data) });
        const json = await res.json();
        if (res.status === 403) { limparSenhaAdmin(); throw new Error('Senha incorreta'); }
        if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`);
        return json;
    },

    async delAdmin(url) {
        const res = await fetch(url, { method: 'DELETE', headers: { 'X-Admin-Senha': _senhaAdmin } });
        const json = await res.json();
        if (res.status === 403) { limparSenhaAdmin(); throw new Error('Senha incorreta'); }
        if (!res.ok) throw new Error(json.erro || `Erro ${res.status}`);
        return json;
    },

    categorias:      { listar: () => API.get('/api/categorias'), criar: d => API.postAdmin('/api/categorias', d), atualizar: (id, d) => API.putAdmin(`/api/categorias/${id}`, d), excluir: id => API.delAdmin(`/api/categorias/${id}`) },
    produtos:        { listar: cid => API.get(`/api/produtos${cid ? '?categoria_id=' + cid : ''}`), obter: id => API.get(`/api/produtos/${id}`), criar: d => API.postAdmin('/api/produtos', d), atualizar: (id, d) => API.putAdmin(`/api/produtos/${id}`, d), excluir: id => API.delAdmin(`/api/produtos/${id}`) },
    acompanhamentos: { listar: () => API.get('/api/acompanhamentos'), criar: d => API.postAdmin('/api/acompanhamentos', d), atualizar: (id, d) => API.putAdmin(`/api/acompanhamentos/${id}`, d), excluir: id => API.delAdmin(`/api/acompanhamentos/${id}`) },
    bebidas:         { listar: combo => API.get(`/api/bebidas${combo ? '?combo=1' : ''}`), criar: d => API.postAdmin('/api/bebidas', d), atualizar: (id, d) => API.putAdmin(`/api/bebidas/${id}`, d), excluir: id => API.delAdmin(`/api/bebidas/${id}`) },
    sobremesas:      { listar: combo => API.get(`/api/sobremesas${combo ? '?combo=1' : ''}`), criar: d => API.postAdmin('/api/sobremesas', d), atualizar: (id, d) => API.putAdmin(`/api/sobremesas/${id}`, d), excluir: id => API.delAdmin(`/api/sobremesas/${id}`) },
    extras:          { listar: () => API.get('/api/extras'), criar: d => API.postAdmin('/api/extras', d), atualizar: (id, d) => API.putAdmin(`/api/extras/${id}`, d), excluir: id => API.delAdmin(`/api/extras/${id}`) },
    regrasCombo:     { listar: () => API.get('/api/regras-combo'), criar: d => API.postAdmin('/api/regras-combo', d), atualizar: (id, d) => API.putAdmin(`/api/regras-combo/${id}`, d), excluir: id => API.delAdmin(`/api/regras-combo/${id}`) },
    pedidos:         { listar: dt => API.get(`/api/pedidos${dt ? '?data=' + dt : ''}`), obter: id => API.get(`/api/pedidos/${id}`), criar: d => API.post('/api/pedidos', d), calcularItem: d => API.post('/api/pedidos/calcular-item', d), reimprimir: (id, dest) => API.post(`/api/pedidos/${id}/reimprimir`, { destino: dest }) },
    impressoras:     { listar: () => API.get('/api/impressoras'), criar: d => API.postAdmin('/api/impressoras', d), atualizar: (id, d) => API.putAdmin(`/api/impressoras/${id}`, d), excluir: id => API.delAdmin(`/api/impressoras/${id}`) },
    configuracoes:   { listar: () => API.get('/api/configuracoes'), salvar: d => API.putAdmin('/api/configuracoes', d) },
    logs:            { listar: () => API.get('/api/logs') },
    admin:           { login: (usuario, senha) => API.post('/api/admin/login', { usuario, senha }) }
};
