import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import {
    Crown, Server, Layout as LayoutIcon, Brain, Sparkles, Github, Globe,
    ShieldCheck, Activity, Database, Zap, Layers, Code, Cpu
} from 'lucide-react';

const HelpCenter = () => {
    // Animation hook
    const [visible, setVisible] = useState(false);
    useEffect(() => { setVisible(true); }, []);

    // Team Data
    const team = [
        { name: "Sinhal Joshi", role: "Team Lead & Full Stack", icon: Crown, color: "#F59E0B", desc: "Architecting the core platform and driving the vision." },
        { name: "Aryan Vala", role: "Backend & ML Specialist", icon: Server, color: "#3B82F6", desc: "Building robust APIs and integrating Machine Learning models." },
        { name: "Viral Sakdecha", role: "Frontend & Data Specialist", icon: LayoutIcon, color: "#10B981", desc: "Crafting intuitive UIs and visualizing complex datasets." },
        { name: "You Sakiria", role: "AI Specialist", icon: Brain, color: "#8B5CF6", desc: "Developing advanced AI analysis and predictive intelligence." }
    ];

    // Feature Data
    const features = [
        { title: "6-Layer Verification", icon: ShieldCheck, color: "#10B981", desc: "Every drug is analyzed across Clinical, Economic, Safety, Vendor, and Resilience layers to ensure total confidence." },
        { title: "AI-Powered Intelligence", icon: Brain, color: "#8B5CF6", desc: "Integrated LLMs (Ollama) provide context-aware answers, side-effect warnings, and instant medical insights." },
        { title: "Live Supply Monitoring", icon: Activity, color: "#EF4444", desc: "Real-time tracking of shortages, price variances, and vendor reliability scores to predict disruptions." }
    ];

    return (
        <Layout>
            <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .fade-in { opacity: 0; animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .delay-1 { animation-delay: 0.1s; } .delay-2 { animation-delay: 0.2s; } .delay-3 { animation-delay: 0.3s; }
                .hover-scale { transition: transform 0.3s ease, box-shadow 0.3s ease; }
                .hover-scale:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }
                .feature-card { background: linear-gradient(145deg, var(--bg-card), rgba(255,255,255,0.5)); border: 1px solid var(--border-color); }
            `}</style>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>

                {/* --- HERO SECTION --- */}
                <div className={`fade-in`} style={{ textAlign: 'center', marginBottom: '80px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '8px 16px', borderRadius: '100px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <Sparkles size={16} className="text-primary" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', letterSpacing: '1px' }}>PROJECT DOCUMENTATION</span>
                    </div>

                    <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: '1.2', marginBottom: '24px', background: 'linear-gradient(to right, #1e293b, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        PharmaLens
                    </h1>

                    <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '750px', margin: '0 auto', lineHeight: '1.6' }}>
                        The opacity of the pharmaceutical supply chain costs billions and risks lives.
                        <strong style={{ color: 'var(--text-primary)' }}> PharmaLens</strong> is the solution—an intelligent platform that verifies, monitors, and predicts drug data.
                    </p>
                </div>

                {/* --- CORE CAPABILITIES --- */}
                <div className={`fade-in delay-1`} style={{ marginBottom: '100px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px', textAlign: 'center' }}>Core Capabilities</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        {features.map((f, i) => (
                            <div key={i} className="feature-card hover-scale" style={{ borderRadius: '20px', padding: '32px' }}>
                                <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: `${f.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: f.color }}>
                                    <f.icon size={24} />
                                </div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>{f.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- TECH STACK --- */}
                <div className={`fade-in delay-2`} style={{ marginBottom: '100px', background: 'var(--bg-card)', borderRadius: '24px', padding: '40px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>System Architecture</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><LayoutIcon size={32} color="#0EA5E9" /></div>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>React + Vite</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><Zap size={32} color="#F59E0B" /></div>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>Node.js API</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><Layers size={32} color="#10B981" /></div>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>6-Layer Engine</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '16px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}><Cpu size={32} color="#8B5CF6" /></div>
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>Locally Integrated AI</span>
                            </div>
                        </div>
                    </div>
                    {/* Background decoration */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.03, background: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}></div>
                </div>

                {/* --- TEAM SECTION --- */}
                <div className={`fade-in delay-3`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{ height: '30px', width: '4px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                        <h2 style={{ fontSize: '28px', fontWeight: 800 }}>The Builders</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
                        {team.map((member, index) => (
                            <div key={member.name} className="hover-scale" style={{
                                background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                                borderRadius: '20px', padding: '32px', position: 'relative', overflow: 'hidden'
                            }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: member.color }}></div>
                                <div style={{ width: '64px', height: '64px', background: `${member.color}15`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                    <member.icon size={32} color={member.color} />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{member.name}</h3>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: member.color, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.8px' }}>{member.role}</div>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{member.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Info */}
                <div style={{ marginTop: '80px', borderTop: '1px solid var(--border-color)', paddingTop: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '12px' }}>© 2026 PharmaLens Team. Engineered for Transparency.</p>
                </div>

            </div>
        </Layout>
    );
};

export default HelpCenter;
