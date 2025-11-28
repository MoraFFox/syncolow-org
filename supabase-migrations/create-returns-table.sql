-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "returnDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Processing', 'Completed', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on orderId for faster lookups
CREATE INDEX IF NOT EXISTS returns_order_id_idx ON returns("orderId");

-- Create index on returnDate for analytics queries
CREATE INDEX IF NOT EXISTS returns_return_date_idx ON returns("returnDate");

-- Enable Row Level Security (RLS)
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all returns
CREATE POLICY "Allow authenticated users to read returns"
  ON returns
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert returns
CREATE POLICY "Allow authenticated users to insert returns"
  ON returns
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow authenticated users to update returns
CREATE POLICY "Allow authenticated users to update returns"
  ON returns
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy to allow authenticated users to delete returns
CREATE POLICY "Allow authenticated users to delete returns"
  ON returns
  FOR DELETE
  TO authenticated
  USING (true);
