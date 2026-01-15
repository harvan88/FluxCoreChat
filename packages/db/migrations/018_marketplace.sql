-- Migration: Add marketplace tables for Vector Stores
-- RAG-005: Marketplace de Vector Stores
-- Date: 2026-01-14

-- ═══════════════════════════════════════════════════════════════════════════
-- Marketplace Listings - Assets en venta/compartidos
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Asset en venta (exactamente uno debe estar presente)
  vector_store_id UUID REFERENCES fluxcore_vector_stores(id) ON DELETE CASCADE,
  instruction_id UUID REFERENCES fluxcore_instructions(id) ON DELETE CASCADE,
  tool_definition_id UUID REFERENCES fluxcore_tool_definitions(id) ON DELETE CASCADE,
  
  -- Vendedor
  seller_account_id UUID NOT NULL REFERENCES accounts(id),
  
  -- Información del listing
  title VARCHAR(255) NOT NULL,
  short_description VARCHAR(500),
  long_description TEXT,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  
  -- Pricing
  pricing_model VARCHAR(20) NOT NULL DEFAULT 'free',
  -- 'free', 'one_time', 'subscription', 'usage'
  price_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_period VARCHAR(20),  -- 'monthly', 'yearly' para subscription
  usage_price_per_1k_tokens INTEGER,  -- Para pricing por uso
  
  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  -- 'draft', 'pending_review', 'active', 'suspended', 'archived'
  
  -- Estadísticas
  total_subscribers INTEGER DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,
  total_queries BIGINT DEFAULT 0,
  rating_average DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- Preview para compradores
  preview_enabled BOOLEAN DEFAULT true,
  preview_chunk_limit INTEGER DEFAULT 5,
  
  -- Licencia
  license_type VARCHAR(50) DEFAULT 'standard',
  -- 'personal', 'commercial', 'enterprise'
  terms_url TEXT,
  
  -- Imágenes y media
  cover_image_url TEXT,
  screenshots JSONB DEFAULT '[]',
  demo_url TEXT,
  
  -- SEO y búsqueda
  search_keywords JSONB DEFAULT '[]',
  featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  published_at TIMESTAMP,
  
  -- Solo un tipo de asset por listing
  CONSTRAINT chk_single_asset_listing CHECK (
    (CASE WHEN vector_store_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN instruction_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN tool_definition_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_listings_seller ON fluxcore_marketplace_listings(seller_account_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON fluxcore_marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON fluxcore_marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_pricing ON fluxcore_marketplace_listings(pricing_model);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON fluxcore_marketplace_listings(featured) WHERE featured = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- Marketplace Subscriptions - Suscripciones a listings
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_marketplace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  listing_id UUID NOT NULL REFERENCES fluxcore_marketplace_listings(id) ON DELETE CASCADE,
  subscriber_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- 'active', 'paused', 'cancelled', 'expired'
  
  -- Billing dates
  started_at TIMESTAMP DEFAULT now() NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Uso (para pricing por uso)
  tokens_used_this_period BIGINT DEFAULT 0,
  queries_this_period INTEGER DEFAULT 0,
  tokens_used_total BIGINT DEFAULT 0,
  queries_total INTEGER DEFAULT 0,
  
  -- Pagos
  external_subscription_id VARCHAR(255),  -- Stripe subscription ID
  last_payment_at TIMESTAMP,
  next_payment_at TIMESTAMP,
  total_paid_cents BIGINT DEFAULT 0,
  
  -- Acceso
  access_mode VARCHAR(20) DEFAULT 'read',
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  UNIQUE(listing_id, subscriber_account_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON fluxcore_marketplace_subscriptions(subscriber_account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_listing ON fluxcore_marketplace_subscriptions(listing_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON fluxcore_marketplace_subscriptions(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- Marketplace Reviews - Reseñas de listings
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fluxcore_marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  listing_id UUID NOT NULL REFERENCES fluxcore_marketplace_listings(id) ON DELETE CASCADE,
  reviewer_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES fluxcore_marketplace_subscriptions(id),
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  
  -- Moderación
  status VARCHAR(20) DEFAULT 'published',
  -- 'pending', 'published', 'hidden', 'flagged'
  
  helpful_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  
  UNIQUE(listing_id, reviewer_account_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_listing ON fluxcore_marketplace_reviews(listing_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Triggers para actualizar estadísticas
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_listings_updated_at ON fluxcore_marketplace_listings;
CREATE TRIGGER trigger_listings_updated_at
  BEFORE UPDATE ON fluxcore_marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON fluxcore_marketplace_subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON fluxcore_marketplace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_updated_at();

-- Trigger para actualizar conteo de suscriptores
CREATE OR REPLACE FUNCTION update_listing_subscriber_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE fluxcore_marketplace_listings 
    SET total_subscribers = total_subscribers + 1
    WHERE id = NEW.listing_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE fluxcore_marketplace_listings 
    SET total_subscribers = total_subscribers - 1
    WHERE id = OLD.listing_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_count ON fluxcore_marketplace_subscriptions;
CREATE TRIGGER trigger_subscription_count
  AFTER INSERT OR DELETE ON fluxcore_marketplace_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_listing_subscriber_count();

-- Trigger para actualizar rating promedio
CREATE OR REPLACE FUNCTION update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fluxcore_marketplace_listings 
  SET 
    rating_average = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM fluxcore_marketplace_reviews 
      WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
        AND status = 'published'
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM fluxcore_marketplace_reviews 
      WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
        AND status = 'published'
    )
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_rating ON fluxcore_marketplace_reviews;
CREATE TRIGGER trigger_review_rating
  AFTER INSERT OR UPDATE OR DELETE ON fluxcore_marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION update_listing_rating();
