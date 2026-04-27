"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types';
import Button from '@/app/components/Button';
import { Send, MessageSquare } from 'lucide-react';

interface ChatMessage {
    id: string;
    user_id?: string;
    user_name: string;
    message: string;
    timestamp: number;
}

export default function RealtimeChat({ roomId, currentUser }: { roomId: string, currentUser: User | null }) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [channel, setChannel] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const supabase = createClient();
        
        // Create a unique channel for this feeder room
        const roomChannel = supabase.channel(`chat_feeder_${roomId}`, {
            config: {
                broadcast: { ack: false },
            },
        });

        roomChannel
            .on(
                'broadcast',
                { event: 'new_message' },
                (payload) => {
                    setMessages((prev) => [...prev, payload.payload as ChatMessage]);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Subscribed to chat room ${roomId}`);
                }
            });

        setChannel(roomChannel);

        return () => {
            supabase.removeChannel(roomChannel);
        };
    }, [roomId]);

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!input.trim() || !channel) return;

        const newMessage: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            user_id: currentUser?.id,
            user_name: currentUser ? currentUser.name : 'Anonymous',
            message: input.trim(),
            timestamp: Date.now()
        };

        // Add locally first for instant feedback
        setMessages((prev) => [...prev, newMessage]);
        setInput('');

        // Broadcast to others
        channel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: newMessage
        });
    };

    return (
        <div className="flex flex-col h-[400px] bg-white border-4 border-foreground shadow-[8px_8px_0px_rgba(0,0,0,1)] rounded-3xl overflow-hidden mt-8">
            <div className="bg-foreground text-background p-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-bold font-mono">Live Chat (No History)</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                        <MessageSquare className="w-8 h-8" />
                        <p className="font-mono text-sm">No messages yet. Start chatting!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.user_id === currentUser?.id ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs font-bold text-muted-foreground mb-1 ml-1">
                                {msg.user_name}
                            </span>
                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] break-words border-2 ${
                                msg.user_id === currentUser?.id 
                                ? 'bg-primary text-primary-foreground border-foreground rounded-tr-sm' 
                                : 'bg-white border-foreground rounded-tl-sm shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                            }`}>
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t-2 border-foreground/10">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border-2 border-foreground rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                    <Button 
                        type="submit" 
                        disabled={!input.trim()}
                        className="flex-shrink-0 !px-3"
                    >
                        <Send className="w-5 h-5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
