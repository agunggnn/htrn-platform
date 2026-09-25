export type Item = {
  id: string
  name: string
  name_en: string | null
  unit: string
  hs_code: string | null
  description: string | null
  image_url?: string | null
  is_active: boolean
}

export type ItemGrade = {
  id: string
  item_id: string
  grade_code: string
  grade_description: string | null
  is_active: boolean
}

export type Supplier = {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  region: string | null
  specialties: string | null
  is_active: boolean
  notes: string | null
}

export type PriceHistory = {
  id: string
  item_id: string
  grade_code: string
  price_per_unit: number
  currency: string
  price_date: string
  source_type: string | null
  supplier_id: string | null
  notes: string | null
  created_at: string
}

export type CompanyProfile = {
  id: string
  company_name: string
  tagline: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  npwp: string | null
  logo_url: string | null
  primary_color: string
}

export type BankAccount = {
  id: string
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  currency: string
  is_primary: boolean
}

export type Signatory = {
  id: string
  name: string
  title: string | null
  signature_url: string | null
  is_default: boolean
}

export type BuyerTier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'
export type PreferredPackaging = 'plastic_5kg' | 'carton_10kg' | 'bulk_25kg' | 'pouch_500g' | 'other'

export type PipelineStage =
  | 'lead'
  | 'target_outreach'
  | 'sample_sent'
  | 'quotation_sent'
  | 'negotiation'
  | 'active_customer'
  | 'closed_lost'

export type Buyer = {
  id: string
  company_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  country: string | null
  currency: string
  language: string
  payment_terms: string | null
  tax_id: string | null
  notes: string | null
  source: string | null
  is_active: boolean
  buyer_tier?: BuyerTier | null
  credit_limit?: number | null
  payment_terms_allowed?: string | null
  preferred_packaging?: string | null
  gacoan_similarity_score?: number | null
  kyc_verified?: boolean | null
  pipeline_stage?: PipelineStage | null
  product_interest?: string | null
  created_at: string
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export type Quotation = {
  id: string
  quo_number: string | null
  buyer_id: string | null
  date: string
  valid_until: string | null
  currency: string
  language: string
  status: QuotationStatus
  subtotal: number | null
  tax_rate: number
  tax_amount: number
  total_amount: number | null
  payment_terms: string | null
  lead_time_days?: number | null
  delivery_terms?: string | null
  notes: string | null
  internal_notes: string | null
  signatory_id: string | null
  created_at: string
}

export type QuotationItem = {
  id: string
  quotation_id: string
  item_id: string | null
  grade_code: string | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
  subtotal: number | null
  hs_code: string | null
  country_of_origin: string
  sort_order: number
}

export type QuotationItemWithItem = QuotationItem & {
  items: Pick<Item, 'name' | 'name_en'> | null
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue'

export type Invoice = {
  id: string
  inv_number: string | null
  quotation_id: string | null
  buyer_id: string | null
  issue_date: string
  due_date: string | null
  currency: string
  exchange_rate: number
  language: string
  status: InvoiceStatus
  subtotal: number | null
  tax_rate: number
  tax_amount: number
  total_amount: number | null
  amount_paid: number
  amount_due: number | null
  payment_terms: string | null
  notes: string | null
  signatory_id: string | null
  created_at: string
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  item_id: string | null
  grade_code: string | null
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  subtotal: number
  hs_code: string | null
  country_of_origin: string
  sort_order: number
}

export type Payment = {
  id: string
  invoice_id: string
  amount: number
  payment_date: string
  method: string | null
  reference_number: string | null
  notes: string | null
  created_at: string
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'

export type PurchaseOrder = {
  id: string
  po_number: string | null
  supplier_id: string | null
  quotation_id: string | null
  status: PurchaseOrderStatus
  order_date: string
  expected_date: string | null
  received_date: string | null
  total_amount: number | null
  notes: string | null
  created_at: string
}

export type POItem = {
  id: string
  po_id: string
  item_id: string | null
  grade_code: string | null
  quantity_ordered: number | null
  quantity_received: number | null
  unit: string | null
  unit_price: number | null
  subtotal: number | null
}

export type POItemWithItem = POItem & {
  items: Pick<Item, 'name' | 'name_en'> | null
}

export type PackingList = {
  id: string
  invoice_id: string
  vessel_name: string | null
  port_of_loading: string | null
  port_of_destination: string | null
  shipping_marks: string | null
  total_net_weight: number | null
  total_gross_weight: number | null
  total_packages: number | null
  container_number: string | null
  seal_number: string | null
  created_at: string
}

export type PackingListItem = {
  id: string
  packing_list_id: string
  invoice_item_id: string | null
  description: string
  packages: number
  net_weight_per_package: number
  gross_weight_per_package: number
  total_net_weight: number
  total_gross_weight: number
  sort_order: number
}

export type ActivityLog = {
  id: string
  user_id: string | null
  entity_type: 'quotation' | 'invoice' | 'purchase_order' | 'buyer' | 'price' | 'packing_list'
  entity_id: string
  action: 'created' | 'updated' | 'status_changed' | 'payment_recorded' | 'deleted'
  description: string
  details?: Record<string, unknown> | null
  created_at: string
}

export type StockMovement = {
  id: string
  item_id: string
  grade_code: string
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  unit: string
  reference_type: 'purchase_order' | 'invoice' | 'manual' | null
  reference_id: string | null
  notes: string | null
  created_at: string
}

export type StockSummary = {
  item_id: string
  item_name: string
  item_name_en: string | null
  unit: string
  grade_code: string
  total_in: number
  total_out: number
  current_stock: number
}
