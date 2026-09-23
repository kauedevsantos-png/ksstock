-- ==============================================================================
-- KS STOCK — SCHEMA COMPLETO MULTI-TENANT COM SUPABASE (POSTGRESQL + RLS)
-- ==============================================================================
-- Este script configura todo o banco de dados do KS Stock.
-- Execute este script no SQL Editor do seu projeto Supabase.

-- 1. HABILITAR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE EMPRESAS (COMPANIES)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255),
    logo_url TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'pro_trial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
-- Vinculada diretamente ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABELA DE CATEGORIAS (CATEGORIES)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#4f46e5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA DE FORNECEDORES (SUPPLIERS)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABELA DE CLIENTES (CUSTOMERS)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. TABELA DE PRODUTOS (PRODUCTS)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 5,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (STOCK_MOVEMENTS)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment', 'sale')),
    quantity INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. TABELA DE VENDAS (SALES)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estimated_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'outro')),
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. TABELA DE ITENS DA VENDA (SALE_ITEMS)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE (COMPANY_ID E CHAVES ESTRANGEIRAS)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON public.stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);

-- ==============================================================================
-- FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- ==============================================================================

-- Retorna o company_id do usuário atualmente autenticado
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Retorna o papel (role: 'admin' ou 'employee') do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ==============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- COMPANIES
CREATE POLICY "Usuários podem ver apenas sua própria empresa"
ON public.companies FOR SELECT
USING (id = public.get_auth_company_id());

CREATE POLICY "Admins podem atualizar sua própria empresa"
ON public.companies FOR UPDATE
USING (id = public.get_auth_company_id() AND public.get_auth_role() = 'admin');

-- PROFILES
CREATE POLICY "Usuários podem visualizar perfis da mesma empresa"
ON public.profiles FOR SELECT
USING (company_id = public.get_auth_company_id());

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Admins podem inserir ou gerenciar perfis na mesma empresa"
ON public.profiles FOR ALL
USING (company_id = public.get_auth_company_id() AND public.get_auth_role() = 'admin');

-- CATEGORIES
CREATE POLICY "Acesso a categorias por empresa"
ON public.categories FOR ALL
USING (company_id = public.get_auth_company_id())
WITH CHECK (company_id = public.get_auth_company_id());

-- SUPPLIERS
CREATE POLICY "Acesso a fornecedores por empresa"
ON public.suppliers FOR ALL
USING (company_id = public.get_auth_company_id())
WITH CHECK (company_id = public.get_auth_company_id());

-- CUSTOMERS
CREATE POLICY "Acesso a clientes por empresa"
ON public.customers FOR ALL
USING (company_id = public.get_auth_company_id())
WITH CHECK (company_id = public.get_auth_company_id());

-- PRODUCTS
CREATE POLICY "Visualização de produtos por empresa"
ON public.products FOR SELECT
USING (company_id = public.get_auth_company_id());

CREATE POLICY "Modificação de produtos por empresa"
ON public.products FOR ALL
USING (company_id = public.get_auth_company_id())
WITH CHECK (company_id = public.get_auth_company_id());

-- STOCK MOVEMENTS
CREATE POLICY "Visualização de movimentações por empresa"
ON public.stock_movements FOR SELECT
USING (company_id = public.get_auth_company_id());

CREATE POLICY "Inserção de movimentações por empresa"
ON public.stock_movements FOR INSERT
WITH CHECK (company_id = public.get_auth_company_id());

-- SALES
CREATE POLICY "Visualização de vendas por empresa"
ON public.sales FOR SELECT
USING (company_id = public.get_auth_company_id());

CREATE POLICY "Inserção de vendas por empresa"
ON public.sales FOR INSERT
WITH CHECK (company_id = public.get_auth_company_id());

-- SALE ITEMS
CREATE POLICY "Visualização de itens de venda por empresa"
ON public.sale_items FOR SELECT
USING (company_id = public.get_auth_company_id());

CREATE POLICY "Inserção de itens de venda por empresa"
ON public.sale_items FOR INSERT
WITH CHECK (company_id = public.get_auth_company_id());

-- ==============================================================================
-- STORED PROCEDURES / RPCs ATÔMICOS
-- ==============================================================================

-- 1. Criação atômica de Empresa + Perfil Admin no momento do cadastro
CREATE OR REPLACE FUNCTION public.register_company_and_admin(
    p_company_name TEXT,
    p_user_name TEXT,
    p_user_email TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_company_slug TEXT;
    v_category_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- Gera slug básico
    v_company_slug := LOWER(REGEXP_REPLACE(TRIM(p_company_name), '[^a-zA-Z0-9]+', '-', 'g'));

    -- 1. Cria a empresa
    INSERT INTO public.companies (name, slug, email)
    VALUES (p_company_name, v_company_slug, p_user_email)
    RETURNING id INTO v_company_id;

    -- 2. Cria o perfil do usuário como ADMIN
    INSERT INTO public.profiles (id, company_id, name, email, role)
    VALUES (v_user_id, v_company_id, p_user_name, p_user_email, 'admin');

    -- 3. Cria categorias padrão de exemplo para a empresa
    INSERT INTO public.categories (company_id, name, color)
    VALUES 
        (v_company_id, 'Geral', '#4f46e5'),
        (v_company_id, 'Vestuário', '#06b6d4'),
        (v_company_id, 'Acessórios', '#10b981');

    RETURN jsonb_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_name', p_company_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ajuste manual de estoque com auditoria
CREATE OR REPLACE FUNCTION public.adjust_stock_atomic(
    p_product_id UUID,
    p_type TEXT,
    p_quantity INTEGER,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
    v_curr_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    v_user_id := auth.uid();
    v_company_id := public.get_auth_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Empresa não identificada para este usuário.';
    END IF;

    -- Busca o produto e bloqueia para atualização
    SELECT stock_quantity INTO v_curr_stock
    FROM public.products
    WHERE id = p_product_id AND company_id = v_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado.';
    END IF;

    IF p_type = 'entry' THEN
        v_new_stock := v_curr_stock + p_quantity;
    ELSIF p_type = 'exit' THEN
        IF v_curr_stock < p_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para esta saída.';
        END IF;
        v_new_stock := v_curr_stock - p_quantity;
    ELSIF p_type = 'adjustment' THEN
        v_new_stock := p_quantity;
    ELSE
        RAISE EXCEPTION 'Tipo de movimentação inválido.';
    END IF;

    -- Atualiza produto
    UPDATE public.products
    SET stock_quantity = v_new_stock, updated_at = NOW()
    WHERE id = p_product_id AND company_id = v_company_id;

    -- Grava movimentação
    INSERT INTO public.stock_movements (
        company_id, product_id, user_id, type,
        quantity, previous_quantity, new_quantity, reason
    ) VALUES (
        v_company_id, p_product_id, v_user_id, p_type,
        ABS(v_new_stock - v_curr_stock), v_curr_stock, v_new_stock, p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'previous_quantity', v_curr_stock,
        'new_quantity', v_new_stock
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Processamento Atômico de Venda
-- Registra a venda, os itens, dá baixa no estoque de cada produto e registra movimentações de estoque
CREATE OR REPLACE FUNCTION public.process_sale_atomic(
    p_customer_id UUID,
    p_payment_method TEXT,
    p_notes TEXT,
    p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_company_id UUID;
    v_user_id UUID;
    v_sale_id UUID;
    v_item RECORD;
    v_product RECORD;
    v_total_amount NUMERIC(12, 2) := 0.00;
    v_total_cost NUMERIC(12, 2) := 0.00;
    v_estimated_profit NUMERIC(12, 2) := 0.00;
    v_item_subtotal NUMERIC(12, 2);
    v_item_cost NUMERIC(12, 2);
    v_item_qty INTEGER;
    v_prod_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_company_id := public.get_auth_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Empresa não identificada para este usuário.';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'A venda deve conter pelo menos um produto.';
    END IF;

    -- 1. Validar disponibilidade de estoque e calcular totais
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
        v_prod_id := v_item.product_id;
        v_item_qty := v_item.quantity;

        SELECT id, name, cost_price, sale_price, stock_quantity
        INTO v_product
        FROM public.products
        WHERE id = v_prod_id AND company_id = v_company_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto não encontrado.';
        END IF;

        IF v_product.stock_quantity < v_item_qty THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto "%". Disponível: %, solicitado: %',
                v_product.name, v_product.stock_quantity, v_item_qty;
        END IF;

        v_item_subtotal := COALESCE(v_item.unit_price, v_product.sale_price) * v_item_qty;
        v_item_cost := v_product.cost_price * v_item_qty;

        v_total_amount := v_total_amount + v_item_subtotal;
        v_total_cost := v_total_cost + v_item_cost;
    END LOOP;

    v_estimated_profit := v_total_amount - v_total_cost;

    -- 2. Criar registro da Venda
    INSERT INTO public.sales (
        company_id, customer_id, user_id, total_amount,
        total_cost, estimated_profit, payment_method, status, notes
    ) VALUES (
        v_company_id, p_customer_id, v_user_id, v_total_amount,
        v_total_cost, v_estimated_profit, p_payment_method, 'completed', p_notes
    ) RETURNING id INTO v_sale_id;

    -- 3. Inserir itens, atualizar estoque e registrar stock_movements
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC)
    LOOP
        v_prod_id := v_item.product_id;
        v_item_qty := v_item.quantity;

        SELECT id, cost_price, sale_price, stock_quantity
        INTO v_product
        FROM public.products
        WHERE id = v_prod_id AND company_id = v_company_id;

        v_item_subtotal := COALESCE(v_item.unit_price, v_product.sale_price) * v_item_qty;

        -- Inserir item da venda
        INSERT INTO public.sale_items (
            company_id, sale_id, product_id, quantity, unit_price, unit_cost, subtotal
        ) VALUES (
            v_company_id, v_sale_id, v_prod_id, v_item_qty,
            COALESCE(v_item.unit_price, v_product.sale_price), v_product.cost_price, v_item_subtotal
        );

        -- Decrementar estoque do produto
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item_qty, updated_at = NOW()
        WHERE id = v_prod_id AND company_id = v_company_id;

        -- Registrar movimentação de estoque tipo 'sale'
        INSERT INTO public.stock_movements (
            company_id, product_id, user_id, type,
            quantity, previous_quantity, new_quantity, reason
        ) VALUES (
            v_company_id, v_prod_id, v_user_id, 'sale',
            v_item_qty, v_product.stock_quantity, v_product.stock_quantity - v_item_qty,
            'Venda #' || SUBSTRING(v_sale_id::text, 1, 8)
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'total_amount', v_total_amount,
        'estimated_profit', v_estimated_profit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
