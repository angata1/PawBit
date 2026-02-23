'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '../components/Card';
import Button from '../components/Button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paymentIntentId = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your deposit...');

    useEffect(() => {
        if (!paymentIntentId || redirectStatus !== 'succeeded') {
            setStatus('error');
            setMessage('Invalid payment information.');
            return;
        }

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
                } else {
                    if (data.message === 'Already processed') {
                        setStatus('success'); // Still show success if refreshed
                    } else {
                        setStatus('error');
                        setMessage(data.error || 'Failed to update wallet.');
                    }
                }
            } catch (err) {
                setStatus('error');
                setMessage('Connection error.');
            }
        };

        confirmDeposit();
    }, [paymentIntentId, redirectStatus]);

    return (
        <div className="min-h-screen pt-24 pb-12 bg-background flex items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-8 border-2 border-foreground">
                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                        <h1 className="text-2xl font-bold mb-2">Processing...</h1>
                        <p className="text-muted-foreground">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black mb-2 text-foreground">Success!</h1>
                        <p className="text-muted-foreground mb-8">
                            Funds have been added to your wallet. You can now start feeding animals.
                        </p>
                        <Button onClick={() => router.push('/profile')} size="lg" className="w-full">
                            Go to Wallet
                        </Button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-muted-foreground mb-8">{message}</p>
                        <Button onClick={() => router.push('/profile')} variant="outline" className="w-full">
                            Return to Profile
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
