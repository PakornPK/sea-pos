import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/auth'
import { billingRepo } from '@/lib/repositories'
import { InvoicePrint } from '@/components/platform/InvoicePrint'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const inv = await billingRepo.getInvoice(id)
  return { title: inv ? `${inv.invoice_no} | ใบกำกับภาษี` : 'ใบกำกับภาษี' }
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin()
  const { id } = await params
  const invoice = await billingRepo.getInvoice(id)
  if (!invoice) notFound()
  return <InvoicePrint invoice={invoice} />
}
