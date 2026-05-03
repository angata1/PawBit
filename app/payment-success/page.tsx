'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const PENDING_DONATION_KEY = 'pawbit:pending-donation-ready';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paymentIntentId = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');
    const fallbackReturnPath = searchParams.get('return_path');

    const t = useTranslations('PaymentSuccess');
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState(t('verifying'));
    const [returnPath, setReturnPath] = useState('/profile');
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        if (!paymentIntentId || redirectStatus !== 'succeeded') {
            setStatus('error');
            setMessage(t('invalidInfo'));
            return;
        }

        const getSafeReturnPath = (path: unknown) => {
            return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
                ? path
                : '/profile';
        };
        setReturnPath(getSafeReturnPath(fallbackReturnPath));

        const confirmDeposit = async () => {
            try {
                const res = await fetch('/api/wallet/confirm-deposit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_intent_id: paymentIntentId })
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                    const nextReturnPath = getSafeReturnPath(data.redirectPath || fallbackReturnPath);
                    setReturnPath(nextReturnPath);

                    if (data.paymentKind === 'pending_donation') {
                        sessionStorage.setItem(PENDING_DONATION_KEY, JSON.stringify({
                            amount: data.amount,
                            mode: data.mode,
                            feederId: data.feederId,
                            returnPath: nextReturnPath,
                            paymentIntentId,
                        }));
                    }
                } else {
                    if (data.message === 'Already processed') {
                        setStatus('success'); // Still show success if refreshed
                    } else {
                        setStatus('error');
                        setMessage(data.error || t('walletUpdateFailed'));
                    }
                }
            } catch {
                setStatus('error');
                setMessage(t('connectionError'));
            }
        };

        confirmDeposit();
    }, [paymentIntentId, redirectStatus, fallbackReturnPath, router, t]);

    return (
        <div className="min-h-screen pt-12 pb-12 bg-background flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-8 border-2 border-foreground">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                        <h1 className="text-2xl font-bold mb-2">{t('processing')}</h1>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black mb-2 text-foreground">{t('successTitle')}</h1>
                        <p className="text-muted-foreground mb-8">
                            {returnPath === '/profile' ? t('successDesc') : t('walletReadyDesc')}
                        </p>
                        <Button onClick={() => router.push(returnPath)} size="lg" className="w-full">
                            {returnPath === '/profile' ? t('goWallet') : t('returnAndDonate')}
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">{t('errorTitle')}</h1>
                        <p className="text-muted-foreground mb-8">{message}</p>
                        <Button onClick={() => router.push(returnPath)} variant="outline" className="w-full">
                            {t('returnProfile')}
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default function PaymentSuccess() {
    return (
        <Suspense fallback={<div className="min-h-screen pt-24 text-center">Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
