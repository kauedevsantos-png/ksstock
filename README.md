# KS STOCK — Sistema SaaS de Controle de Estoque & Vendas

> **Controle seu estoque. Simplifique seu negócio.**

O **KS Stock** é um sistema SaaS multiempresa de alta velocidade e design premium para micro e pequenas empresas gerenciarem produtos, estoque, vendas e faturamento de forma simples e intuitiva ("1 ação → 1 resultado").

---

## 🚀 Principais Funcionalidades

- **Multiempresa (Multi-tenant) Seguro**: Isolamento lógico por `company_id` em todas as tabelas protegido por **Row Level Security (RLS)** no PostgreSQL. Nenhuma empresa tem acesso aos dados de outra.
- **Autenticação & Perfis**: Supabase Auth (e-mail e senha) com suporte a perfis de Administrador e Funcionário.
- **Ponto de Venda & Vendas Atômicas**: Emissão de vendas em 1 clique via Stored Procedure (`process_sale_atomic`) com baixa automática de estoque, validação de disponibilidade e auditoria de movimentação.
- **Catálogo de Produtos Inteligente**: Busca em tempo real, filtros de status (Em estoque, Baixo, Sem estoque) e **cálculo automático de margem de lucro** (R$ e %) ao preencher o custo e a venda.
- **Auditoria & Histórico de Estoque**: Entradas, saídas manuais e ajustes com rastreabilidade total de usuário, motivo e data/hora.
- **Dashboard em Tempo Real**: KPIs de vendas de hoje, faturamento do mês, lucro estimado, produtos em ruptura e gráfico interativo (Hoje, 7 dias, 30 dias, Mês).
- **Clientes & Fornecedores**: Gestão de contatos com integração de atalho para WhatsApp.
- **Relatórios**: Valuation do estoque (a custo e potencial de venda), ticket médio e curva de produtos mais vendidos.
- **Design System Premium**: Interface moderna, clean, 100% responsiva (Desktop, Tablet, Smartphone com menu off-canvas), toasts, modais e feedback instantâneo.

---

## 🛠️ Stack Tecnológica

- **Frontend**: HTML5, CSS3 Moderno, JavaScript Puro Modular (ES6)
- **Bibliotecas CDN**: `@supabase/supabase-js v2`, `Chart.js`
- **Banco de Dados & Auth**: Supabase (PostgreSQL 15+, Auth, RLS, Stored Procedures)
- **Hospedagem**: Vercel / GitHub Pages

---

## 📦 Como Configurar o Projeto

### 1. Configurar o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. No painel do Supabase, acesse o menu **SQL Editor** no menu lateral esquerdo.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql), copie todo o seu conteúdo e cole no SQL Editor do Supabase.
4. Clique em **Run** para criar todas as tabelas, índices, políticas RLS e funções atômicas.
5. (Opcional) No painel **Authentication -> Providers -> Email**, desative a opção "Confirm email" caso deseje liberar o login imediatamente após o cadastro nos seus testes.

### 2. Conectar as Credenciais no Frontend

1. No Supabase, vá em **Project Settings -> API**.
2. Copie os valores:
   - **Project URL**
   - **Project API Keys (`anon` / `public`)**
3. Abra o arquivo [`js/config.js`](js/config.js) no seu editor de código e cole as chaves:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://seu-projeto.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  // ...
};
```

---

## 💻 Como Rodar Localmente

Como o KS Stock foi desenvolvido em HTML/CSS/JS puro, você pode executá-lo em qualquer servidor local:

### Com Python:
```bash
python -m http.server 3000
```
Acesse `http://localhost:3000` no seu navegador.

### Com Node / npx:
```bash
npx serve .
```

### Com VS Code Live Server:
Basta clicar com o botão direito em `index.html` e selecionar **"Open with Live Server"**.

---

## ☁️ Deploy na Vercel

O projeto já inclui o arquivo [`vercel.json`](vercel.json) configurado:

1. Envie o código para o seu repositório no **GitHub**.
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New -> Project**.
3. Importe o repositório do KS Stock.
4. Clique em **Deploy**.
5. Seu SaaS estará online imediatamente!

---

## 🔒 Garantia de Segurança Multi-Tenant

Toda a segurança está no banco de dados via **Row Level Security (RLS)**:
```sql
CREATE POLICY "Visualização de produtos por empresa"
ON public.products FOR SELECT
USING (company_id = public.get_auth_company_id());
```
Mesmo que um usuário mal-intencionado manipule as requisições no navegador, o PostgreSQL rejeita qualquer operação fora do escopo da sua empresa.

---

Feito com excelência por **Kaue Santos / KS Stock**.


## Produção / Segurança

Execute `supabase/hardening.sql` no SQL Editor depois das migrações de planos/assinaturas.
