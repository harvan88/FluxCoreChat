-- Bootstrapping the First Reality Adapter: WhatsApp Gateway
-- Allows signals from Driver: @fluxcore/whatsapp
-- Certified by Adapter: fluxcore/whatsapp-gateway

INSERT INTO fluxcore_reality_adapters (
    adapter_id,
    driver_id,
    adapter_class,
    description,
    signing_secret,
    adapter_version
) VALUES (
    'fluxcore/whatsapp-gateway',
    '@fluxcore/whatsapp',
    'GATEWAY',
    'WhatsApp Business API Gateway Adapter',
    'development_signing_secret_wa', -- TODO: Rotate this in production
    '1.0.0-rfc0001'
)
ON CONFLICT (adapter_id) DO UPDATE SET
    signing_secret = EXCLUDED.signing_secret,
    adapter_version = EXCLUDED.adapter_version;
