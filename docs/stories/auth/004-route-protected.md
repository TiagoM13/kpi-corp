## Proteção de Rotas

## 📋 Descrição

Como sistema, quero garantir que rotas de Admin não sejam acessíveis por Membros, e vice-versa.

## ✅ Critérios de Aceite

- [ ]  Rota /admin/* bloqueada para usuários com perfil MEMBRO
- [ ]  Tentativa de acesso não autorizado redireciona para tela de acesso negado ou login
- [ ]  Token inválido ou expirado redireciona para login
- [ ]  Middleware de autenticação aplicado em todas as rotas protegidas da API

## 📌 Informações

- Épico: Auth & Acesso
- Perfil: Sistema
- Prioridade: Alta
- Fase: MVP