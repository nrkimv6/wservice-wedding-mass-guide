-- Analytics table for tracking mass access statistics
CREATE TABLE IF NOT EXISTS mass_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mass_id UUID NOT NULL REFERENCES masses(id) ON DELETE CASCADE,

  -- Visitor information
  visitor_id TEXT NOT NULL, -- Anonymous ID from localStorage/fingerprint
  user_agent TEXT,
  ip_address INET,

  -- Visit tracking
  first_visit_at TIMESTAMPTZ DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,

  -- Session tracking
  total_duration_seconds INTEGER DEFAULT 0, -- Total time spent across all sessions

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique visitor per mass
  UNIQUE(mass_id, visitor_id)
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_mass_analytics_mass_id ON mass_analytics(mass_id);
CREATE INDEX IF NOT EXISTS idx_mass_analytics_first_visit ON mass_analytics(first_visit_at);

-- Function to update analytics
CREATE OR REPLACE FUNCTION track_mass_visit(
  p_mass_id UUID,
  p_visitor_id TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO mass_analytics (
    mass_id,
    visitor_id,
    user_agent,
    ip_address,
    first_visit_at,
    last_visit_at,
    visit_count
  ) VALUES (
    p_mass_id,
    p_visitor_id,
    p_user_agent,
    p_ip_address,
    NOW(),
    NOW(),
    1
  )
  ON CONFLICT (mass_id, visitor_id)
  DO UPDATE SET
    last_visit_at = NOW(),
    visit_count = mass_analytics.visit_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for mass_analytics
ALTER TABLE mass_analytics ENABLE ROW LEVEL SECURITY;

-- Admin users can view all analytics (will be refined with specific admin check)
CREATE POLICY "Admin users can view all analytics"
  ON mass_analytics
  FOR SELECT
  USING (true); -- Will add admin check in application layer

-- Service role can insert/update analytics
CREATE POLICY "Service can manage analytics"
  ON mass_analytics
  FOR ALL
  USING (true);

-- Grant permissions
GRANT SELECT ON mass_analytics TO authenticated;
GRANT ALL ON mass_analytics TO service_role;
