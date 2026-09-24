import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Smartphone } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/dal'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Checkout' }

/**
 * Placeholder checkout.
 *
 * No payment rail is connected yet, so this states that plainly rather than
 * faking a success screen. The order row is real and provider-agnostic, so
 * wiring M-Pesa or a card PSP later means adding a provider adapter, not
 * reshaping the data.
 */
export default async function CheckoutPage(
  props: PageProps<'/checkout/[orderId]'>,
) {
  const { orderId } = await props.params
  const user = await requireUser()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      amountCents: true,
      currency: true,
      status: true,
      program: { select: { id: true, title: true } },
      coach: {
        select: {
          slug: true,
          user: { select: { profile: { select: { fullName: true } } } },
        },
      },
    },
  })

  if (!order || order.userId !== user.id) notFound()

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="font-bold">{order.program?.title ?? 'Order'}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              with {order.coach.user.profile?.fullName ?? 'your coach'}
            </p>
          </div>
          <p className="text-3xl font-extrabold text-[var(--color-brand)]">
            {formatPrice(order.amountCents, order.currency)}
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Order {order.id.slice(0, 8)} · {order.status}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Smartphone
              className="size-5 shrink-0 text-[var(--color-brand)]"
              aria-hidden
            />
            <p className="font-bold">Payments aren’t live yet</p>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            This order has been recorded, but no money can change hands until a
            payment provider is connected. Mobile money (M-Pesa and others) and
            cards are planned.
          </p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            In the meantime, message{' '}
            <Link
              href={`/coaches/${order.coach.slug}`}
              className="font-semibold underline"
            >
              {order.coach.user.profile?.fullName?.split(' ')[0] ?? 'the coach'}
            </Link>{' '}
            to arrange access, or try one of their free programs.
          </p>
        </CardContent>
      </Card>

      <ButtonLink href={`/coaches/${order.coach.slug}`} variant="outline" block>
        Back to coach
      </ButtonLink>
    </div>
  )
}
