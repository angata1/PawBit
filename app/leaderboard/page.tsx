"use client";

import { useEffect, useState } from "react";
import { Storage } from "../storage";
import { User } from "../types";
import Card from "../components/Card";
import { Trophy, Medal, Star, Crown } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

export default function Leaderboard() {
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        setUsers(Storage.getUsers());
    }, []);

    const sortedUsers = [...users].sort(
        (a, b) => b.totalDonated - a.totalDonated
    );

    // Data for chart
    const chartData = sortedUsers.slice(0, 6).map((u) => ({
        name: u.isAnonymous ? "Anonymous" : u.name.split(" ")[0],
        amount: u.totalDonated,
    }));

    const COLORS = [
        "#7aa374",
        "#ecae78",
        "#d4be96",
        "#a3a3a3",
        "#a3a3a3",
        "#a3a3a3",
    ];

    const getRankBadge = (index: number) => {
        if (index === 0)
            return (
                <div className="bg-yellow-400 p-2 rounded-full border-2 border-foreground">
                    <Crown className="w-6 h-6 text-white" fill="currentColor" />
                </div>
            );
        if (index === 1)
            return (
                <div className="bg-gray-300 p-2 rounded-full border-2 border-foreground">
                    <Medal className="w-6 h-6 text-white" fill="currentColor" />
                </div>
            );
        if (index === 2)
            return (
                <div className="bg-orange-400 p-2 rounded-full border-2 border-foreground">
                    <Medal className="w-6 h-6 text-white" fill="currentColor" />
                </div>
            );
        return (
            <span className="font-mono font-bold text-xl text-muted-foreground w-10 text-center">
                #{index + 1}
            </span>
        );
    };

    return (
        <div className="min-h-screen pt-24 px-4 pb-12 container mx-auto max-w-5xl">
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-1 rounded-full border-2 border-foreground/10 mb-4 shadow-sm">
                    <Star className="w-4 h-4 text-accent fill-accent" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Community Heroes
                    </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black mb-4 text-foreground">
                    Wall of Fame
                </h1>
                <p className="text-xl text-muted-foreground font-mono max-w-2xl mx-auto">
                    Celebrating the top contributors who keep the bowls full and tails
                    wagging.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
                {/* Top 3 Podium */}
                <div className="space-y-4">
                    {sortedUsers.slice(0, 3).map((user, idx) => (
                        <div
                            key={user.id}
                            className={`
                relative flex items-center gap-6 p-6 rounded-2xl border-2 
                transition-all duration-300 hover:-translate-y-1 hover:shadow-lg
                ${idx === 0
                                    ? "bg-yellow-50 border-yellow-400 shadow-md z-10"
                                    : "bg-white border-foreground/10 shadow-sm"
                                }
              `}
                        >
                            <div className="flex-shrink-0">{getRankBadge(idx)}</div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-bold">
                                    {user.isAnonymous ? "Secret Hero" : user.name}
                                </h3>
                                <p className="text-xs font-mono opacity-60 uppercase tracking-wider">
                                    {idx === 0 ? "Top Donator" : "Community Leader"}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="block text-2xl font-black text-primary">
                                    {user.totalDonated.toFixed(0)}
                                    <span className="text-sm align-top">лв</span>
                                </span>
                            </div>

                            {/* Decorative element for #1 */}
                            {idx === 0 && (
                                <Star
                                    className="absolute top-4 right-4 text-yellow-400 w-4 h-4 animate-pulse"
                                    fill="currentColor"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Stats Chart */}
                <div className="bg-white rounded-2xl border-2 border-foreground/10 p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-6 text-center font-serif">
                        Weekly Contribution
                    </h3>
                    <div style={{ width: "100%", height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <XAxis
                                    dataKey="name"
                                    stroke="#888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `лв${val}`}
                                />
                                <Tooltip
                                    cursor={{ fill: "transparent" }}
                                    contentStyle={{
                                        backgroundColor: "rgb(var(--card))",
                                        border: "2px solid rgb(var(--foreground))",
                                        borderRadius: "12px",
                                        fontFamily: "Space Mono",
                                        boxShadow: "4px 4px 0px rgba(0,0,0,0.1)",
                                    }}
                                />
                                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Clean List for Rest */}
            <div className="bg-white rounded-3xl p-2 md:p-8 shadow-sm border-2 border-foreground/5">
                <h3 className="text-xl font-bold mb-6 px-4 font-serif">
                    Honorary Feeders
                </h3>
                <div className="space-y-2">
                    {sortedUsers.slice(3).map((user, idx) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-muted-foreground/40 w-8">
                                    #{idx + 4}
                                </span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                                        {user.isAnonymous ? "Anonymous" : user.name}
                                    </span>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-gray-500">
                                {user.totalDonated.toFixed(2)}лв
                            </span>
                        </div>
                    ))}
                    {sortedUsers.length < 4 && (
                        <div className="text-center py-8 text-muted-foreground italic bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            Join the ranks! Make your first donation to appear here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
