import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShoppingCart, Package, Users, BarChart3, Settings, Search, Plus, Minus, Trash2, X, Check,
  AlertTriangle, Star, CreditCard, QrCode, Banknote, Image as ImageIcon, Phone, Mail,
  MessageCircle, ChevronRight, TrendingUp, Clock, Upload, RefreshCw, FileText, Grid3x3,
  List as ListIcon, User, ArrowLeft, Sparkles, Download, PackageX, PackageCheck,
  Lock, LogOut, Percent, Tag, Camera, CameraOff, Wallet, ScanLine
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

/* ============================== CONSTANTES ============================== */

const STORAGE_KEYS = {
  CATALOGO: 'catalogo_v1',
  CLIENTES: 'clientes_v1',
  VENDAS: 'vendas_v1',
  EMPRESA: 'empresa_v1',
  AUTH: 'auth_v1',
  PROMOCOES: 'promocoes_v1',
  MOVIMENTACOES: 'movimentacoes_v1',
  CAIXAS: 'caixas_v1',
  SESSAO: 'sessao_v1',
};

const CAMPANHAS_SUBCATEGORIAS = ['Dia das Mães', 'Dia dos Pais', 'Dia dos Namorados', 'Black Friday', 'Natal'];

const CATEGORIAS_PADRAO = [
  { nome: 'Perfumaria' },
  { nome: 'Bolsas' },
  { nome: 'Acessórios de celular' },
  { nome: 'Papelaria' },
  { nome: 'Campanhas', subcategorias: CAMPANHAS_SUBCATEGORIAS },
];

const FORMAS_PAGAMENTO = [
  { id: 'debito', label: 'Débito à vista', icone: CreditCard },
  { id: 'credito', label: 'Crédito a prazo', icone: CreditCard },
  { id: 'pix', label: 'Pix', icone: QrCode },
  { id: 'dinheiro', label: 'Dinheiro', icone: Banknote },
];

const CATEGORY_PALETTE = ['#7A2E4D', '#2E5C8A', '#3F7D58', '#8A4B2E', '#5B4F9E', '#B0553D'];
const PAGAMENTO_CORES = { debito: '#2E5C8A', credito: '#7A2E4D', pix: '#3F7D58', dinheiro: '#8A4B2E' };

const DEFAULT_AUTH = {
  admin: { login: 'admin', senha: 'admin123', cpf: '' },
  vendedor: { login: 'venda', senha: 'venda123' },
};

/* ============================== HELPERS ============================== */

function uid(prefixo) {
  return `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function formatBRL(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDateBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('pt-BR');
}
function acumularPagamento(venda, porForma) {
  if (venda.formaPagamento === 'misto' && Array.isArray(venda.pagamentos)) {
    venda.pagamentos.forEach((p) => { porForma[p.forma] = (porForma[p.forma] || 0) + p.valor; });
  } else {
    porForma[venda.formaPagamento] = (porForma[venda.formaPagamento] || 0) + venda.total;
  }
}
function labelFormaPagamento(id, parcelas) {
  const base = FORMAS_PAGAMENTO.find((f) => f.id === id)?.label || id;
  if (id === 'credito' && parcelas > 1) return `${base} (${parcelas}x sem juros)`;
  return base;
}
let emailjsCarregado = false;
function carregarEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { emailjsCarregado = true; resolve(); return; }
    if (emailjsCarregado) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => { emailjsCarregado = true; resolve(); };
    script.onerror = () => reject(new Error('Não foi possível carregar o serviço de e-mail'));
    document.head.appendChild(script);
  });
}
async function enviarViaEmailJS(empresa, params) {
  await carregarEmailJS();
  window.emailjs.init({ publicKey: empresa.emailjsPublicKey });
  return window.emailjs.send(empresa.emailjsServiceId, empresa.emailjsTemplateId, params);
}
let html2canvasCarregado = false;
function carregarHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) { html2canvasCarregado = true; resolve(); return; }
    if (html2canvasCarregado) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => { html2canvasCarregado = true; resolve(); };
    script.onerror = () => reject(new Error('Não foi possível carregar o gerador de imagem'));
    document.head.appendChild(script);
  });
}
async function gerarImagemRecibo() {
  await carregarHtml2Canvas();
  const elemento = document.getElementById('recibo-print');
  const canvas = await window.html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff' });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}
function localDateISO(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const offsetMs = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - offsetMs).toISOString().slice(0, 10);
}
function soData(valor) {
  if (!valor) return null;
  if (typeof valor === 'string' && valor.length === 10) return valor;
  return localDateISO(new Date(valor));
}
function todayISODate() {
  return localDateISO(new Date());
}
function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function isoWeekLabel(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `Sem ${weekNo}/${d.getFullYear()}`;
}
function monthLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}
function categoryColor(nome) {
  let h = 0;
  for (let i = 0; i < (nome || '').length; i++) h += nome.charCodeAt(i);
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}
function onlyDigits(s) {
  return (s || '').replace(/\D/g, '');
}
function formatCPF(v) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function formatTelefone(v) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}
function normalizarCategorias(raw) {
  let cats = Array.isArray(raw) && raw.length ? raw.map((c) => (typeof c === 'string' ? { nome: c } : c)) : CATEGORIAS_PADRAO.map((c) => ({ ...c }));
  if (!cats.some((c) => c.nome === 'Campanhas')) {
    cats = [...cats, { nome: 'Campanhas', subcategorias: CAMPANHAS_SUBCATEGORIAS }];
  } else {
    cats = cats.map((c) => (c.nome === 'Campanhas' ? { ...c, subcategorias: c.subcategorias && c.subcategorias.length ? c.subcategorias : CAMPANHAS_SUBCATEGORIAS } : c));
  }
  return cats;
}
function promocaoAtiva(produtoId, promocoes, dataRef) {
  const hoje = dataRef || todayISODate();
  const ativas = (promocoes || []).filter((p) => p.produtosIds.includes(produtoId) && p.dataInicio <= hoje && hoje <= p.dataFim);
  if (ativas.length === 0) return null;
  return ativas.reduce((maior, p) => (p.percentual > maior.percentual ? p : maior), ativas[0]);
}

/* ============================== DADOS DE DEMONSTRAÇÃO ============================== */

function gerarSeed() {
  const hoje = new Date();
  const diasAtras = (n) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const produtos = [
    { id: uid('p'), codigo: '7891000001', nome: 'Perfume Essência Floral 100ml', descricao: 'Fragrância floral suave, longa duração', categoria: 'Perfumaria', precoCusto: 28, precoVenda: 69.9, quantidade: 14, estoqueIdeal: 20, dataEntrada: diasAtras(12), imagemUrl: null },
    { id: uid('p'), codigo: '7891000002', nome: 'Perfume Madeira Âmbar 100ml', descricao: 'Fragrância amadeirada unissex', categoria: 'Perfumaria', precoCusto: 32, precoVenda: 79.9, quantidade: 3, estoqueIdeal: 15, dataEntrada: diasAtras(50), imagemUrl: null },
    { id: uid('p'), codigo: '7891000003', nome: 'Body Splash Cítrico 200ml', descricao: 'Refrescante, toque leve', categoria: 'Perfumaria', precoCusto: 12, precoVenda: 34.9, quantidade: 22, estoqueIdeal: 25, dataEntrada: diasAtras(5), imagemUrl: null },
    { id: uid('p'), codigo: '7892000001', nome: 'Bolsa Transversal Couro Sintético', descricao: 'Alça ajustável, compartimento interno', categoria: 'Bolsas', precoCusto: 45, precoVenda: 119.9, quantidade: 8, estoqueIdeal: 12, dataEntrada: diasAtras(20), imagemUrl: null },
    { id: uid('p'), codigo: '7892000002', nome: 'Bolsa Tote Grande', descricao: 'Ideal para o dia a dia', categoria: 'Bolsas', precoCusto: 38, precoVenda: 99.9, quantidade: 1, estoqueIdeal: 10, dataEntrada: diasAtras(60), imagemUrl: null },
    { id: uid('p'), codigo: '7892000003', nome: 'Necessaire Pequena', descricao: 'Kit com 2 unidades', categoria: 'Bolsas', precoCusto: 15, precoVenda: 39.9, quantidade: 18, estoqueIdeal: 20, dataEntrada: diasAtras(8), imagemUrl: null },
    { id: uid('p'), codigo: '7893000001', nome: 'Capa de Silicone Universal', descricao: 'Compatível com diversos modelos', categoria: 'Acessórios de celular', precoCusto: 8, precoVenda: 24.9, quantidade: 40, estoqueIdeal: 40, dataEntrada: diasAtras(3), imagemUrl: null },
    { id: uid('p'), codigo: '7893000002', nome: 'Película de Vidro 3D', descricao: 'Proteção contra impacto', categoria: 'Acessórios de celular', precoCusto: 4, precoVenda: 19.9, quantidade: 5, estoqueIdeal: 30, dataEntrada: diasAtras(45), imagemUrl: null },
    { id: uid('p'), codigo: '7893000003', nome: 'Fone Bluetooth TWS', descricao: 'Estojo carregador incluso', categoria: 'Acessórios de celular', precoCusto: 35, precoVenda: 89.9, quantidade: 11, estoqueIdeal: 15, dataEntrada: diasAtras(15), imagemUrl: null },
    { id: uid('p'), codigo: '7893000004', nome: 'Cabo USB-C Reforçado 1m', descricao: 'Carregamento rápido', categoria: 'Acessórios de celular', precoCusto: 9, precoVenda: 29.9, quantidade: 0, estoqueIdeal: 25, dataEntrada: diasAtras(70), imagemUrl: null },
    { id: uid('p'), codigo: '7894000001', nome: 'Caderno Universitário 10 Matérias', descricao: 'Capa dura, 200 folhas', categoria: 'Papelaria', precoCusto: 14, precoVenda: 32.9, quantidade: 25, estoqueIdeal: 30, dataEntrada: diasAtras(10), imagemUrl: null },
    { id: uid('p'), codigo: '7894000002', nome: 'Kit Canetas Coloridas (12un)', descricao: 'Ponta fina, cores vibrantes', categoria: 'Papelaria', precoCusto: 10, precoVenda: 24.9, quantidade: 30, estoqueIdeal: 30, dataEntrada: diasAtras(6), imagemUrl: null },
    { id: uid('p'), codigo: '7894000003', nome: 'Agenda Planner 2026', descricao: 'Semanal, com elástico', categoria: 'Papelaria', precoCusto: 18, precoVenda: 44.9, quantidade: 2, estoqueIdeal: 18, dataEntrada: diasAtras(55), imagemUrl: null },
  ];

  const clientes = [
    { id: uid('c'), nome: 'Marina', sobrenome: 'Souza', telefone: '11987654321', email: 'marina.souza@email.com', cpf: '12345678901', cep: '', endereco: '', observacao: '', querNotaFiscal: true },
    { id: uid('c'), nome: 'Carlos', sobrenome: 'Pereira', telefone: '11976543210', email: 'carlos.pereira@email.com', cpf: '', cep: '', endereco: '', observacao: '', querNotaFiscal: false },
    { id: uid('c'), nome: 'Juliana', sobrenome: 'Ramos', telefone: '11965432109', email: 'juliana.ramos@email.com', cpf: '98765432100', cep: '', endereco: '', observacao: '', querNotaFiscal: true },
    { id: uid('c'), nome: 'Pedro', sobrenome: 'Lima', telefone: '11954321098', email: '', cpf: '', cep: '', endereco: '', observacao: '', querNotaFiscal: false },
  ];

  const vendas = [];
  const formas = ['debito', 'credito', 'pix', 'dinheiro'];
  for (let i = 0; i < 34; i++) {
    const diasAtrasN = Math.floor(Math.random() * 42);
    const data = diasAtras(diasAtrasN);
    const numItens = 1 + Math.floor(Math.random() * 3);
    const itens = [];
    const usados = new Set();
    for (let j = 0; j < numItens; j++) {
      let p = produtos[Math.floor(Math.random() * produtos.length)];
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      const qtd = 1 + Math.floor(Math.random() * 2);
      itens.push({ produtoId: p.id, nome: p.nome, codigo: p.codigo, precoUnitario: p.precoVenda, quantidade: qtd, percentualPromo: 0 });
    }
    if (itens.length === 0) continue;
    const total = itens.reduce((s, it) => s + it.precoUnitario * it.quantidade, 0);
    const cliente = Math.random() > 0.3 ? clientes[Math.floor(Math.random() * clientes.length)] : null;
    vendas.push({
      id: uid('v'),
      data: new Date(data + 'T' + String(9 + Math.floor(Math.random() * 9)).padStart(2, '0') + ':00:00').toISOString(),
      clienteId: cliente ? cliente.id : null,
      clienteNome: cliente ? `${cliente.nome} ${cliente.sobrenome}` : 'Venda avulsa',
      itens,
      formaPagamento: formas[Math.floor(Math.random() * formas.length)],
      total,
      descontoAdicional: 0,
      notaFiscal: { solicitada: !!(cliente && cliente.querNotaFiscal), cpf: cliente ? cliente.cpf : '', enviada: false, canal: null },
    });
  }
  vendas.sort((a, b) => new Date(b.data) - new Date(a.data));

  return { produtos, clientes, vendas };
}

/* ============================== COMPONENTES DE APOIO ============================== */

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 toast-anim"
      style={{ background: toast.tipo === 'erro' ? 'var(--danger)' : 'var(--ink)', color: '#fff' }}>
      {toast.tipo === 'erro' ? <AlertTriangle size={16} /> : <Check size={16} />}
      {toast.mensagem}
    </div>
  );
}

function Modal({ onClose, title, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(36,27,47,0.45)' }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col`} style={{ maxHeight: '90dvh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ texto, onConfirmar, onCancelar }) {
  return (
    <Modal onClose={onCancelar} title="Confirmar ação">
      <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>{texto}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancelar} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirmar} className="btn-danger">Confirmar</button>
      </div>
    </Modal>
  );
}

function StockBadge({ produto }) {
  const pct = produto.estoqueIdeal > 0 ? produto.quantidade / produto.estoqueIdeal : 1;
  if (produto.quantidade <= 0) {
    return <span className="badge" style={{ background: '#F6E4E4', color: 'var(--danger)' }}><PackageX size={12} /> Sem estoque</span>;
  }
  if (pct <= 0.3) {
    return <span className="badge" style={{ background: '#FBEADD', color: 'var(--warning)' }}><AlertTriangle size={12} /> Estoque baixo</span>;
  }
  return <span className="badge" style={{ background: '#E4EEE8', color: 'var(--success)' }}><PackageCheck size={12} /> Estoque ok</span>;
}

function PromoBadge({ percentual }) {
  return <span className="badge" style={{ background: '#EFE7CE', color: '#8A6D1D' }}><Tag size={11} /> -{percentual}%</span>;
}

function EmptyState({ icone: Icone, titulo, subtitulo }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--bg)' }}>
        <Icone size={24} style={{ color: 'var(--ink-soft)' }} />
      </div>
      <p className="font-medium" style={{ color: 'var(--ink)' }}>{titulo}</p>
      {subtitulo && <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--ink-soft)' }}>{subtitulo}</p>}
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>{label}</span>
      <input {...props} className="campo" />
    </label>
  );
}

function ScannerModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [erro, setErro] = useState('');
  const [suportado, setSuportado] = useState(true);

  useEffect(() => {
    let ativo = true;
    let intervalo;
    (async () => {
      if (!('BarcodeDetector' in window)) {
        setSuportado(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!ativo) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
        intervalo = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            if (codigos.length > 0 && ativo) onDetected(codigos[0].rawValue);
          } catch (e) {}
        }, 400);
      } catch (e) {
        setErro('Não foi possível acessar a câmera. Verifique a permissão do navegador para este site.');
      }
    })();
    return () => {
      ativo = false;
      if (intervalo) clearInterval(intervalo);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <Modal onClose={onClose} title="Escanear código de barras">
      {!suportado ? (
        <div className="text-center py-6">
          <CameraOff size={32} style={{ color: 'var(--ink-soft)', margin: '0 auto' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--ink-soft)' }}>
            Este navegador não suporta leitura automática de código de barras. Use o Google Chrome em um Android, ou digite o código manualmente.
          </p>
        </div>
      ) : erro ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--danger)' }}>{erro}</p>
      ) : (
        <div>
          <video ref={videoRef} className="w-full rounded-lg" style={{ background: '#000', aspectRatio: '4/3', objectFit: 'cover' }} muted playsInline />
          <p className="text-xs text-center mt-2 flex items-center justify-center gap-1.5" style={{ color: 'var(--ink-soft)' }}><ScanLine size={13} /> Aponte a câmera para o código de barras</p>
        </div>
      )}
    </Modal>
  );
}

/* ============================== NAVEGAÇÃO ============================== */

const NAV_ITEMS = [
  { id: 'pdv', label: 'Vender', icone: ShoppingCart, roles: ['admin', 'vendedor'] },
  { id: 'produtos', label: 'Produtos', icone: Package, roles: ['admin', 'vendedor'] },
  { id: 'clientes', label: 'Clientes', icone: Users, roles: ['admin', 'vendedor'] },
  { id: 'caixa', label: 'Caixa', icone: Wallet, roles: ['admin', 'vendedor'] },
  { id: 'dashboard', label: 'Painel', icone: BarChart3, roles: ['admin', 'vendedor'] },
  { id: 'promocoes', label: 'Campanhas', icone: Tag, roles: ['admin'] },
  { id: 'config', label: 'Ajustes', icone: Settings, roles: ['admin'] },
];

function Sidebar({ view, setView, empresa, sessao, onSair }) {
  const itens = NAV_ITEMS.filter((i) => i.roles.includes(sessao.role));
  return (
    <div className="hidden md:flex md:flex-col w-60 shrink-0 h-screen sticky top-0" style={{ background: 'var(--ink)' }}>
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: 'var(--accent)' }}>
          {empresa.logoUrl ? <img src={empresa.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Sparkles size={18} style={{ color: 'var(--ink)' }} />}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{empresa.nome || 'Minha Loja'}</p>
          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>Gestão de vendas</p>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {itens.map((item) => {
          const ativo = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{ background: ativo ? 'var(--accent)' : 'transparent', color: ativo ? 'var(--ink)' : 'rgba(255,255,255,0.75)', fontWeight: ativo ? 600 : 500 }}>
              <item.icone size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <p className="text-[11px] mb-2 capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>{sessao.role === 'admin' ? 'Administrador' : 'Vendedor'} · {sessao.login}</p>
        <button onClick={onSair} className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}><LogOut size={13} /> Sair</button>
      </div>
    </div>
  );
}

function BottomNav({ view, setView, sessao }) {
  const itens = NAV_ITEMS.filter((i) => i.roles.includes(sessao.role));
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around border-t" style={{ background: '#fff', borderColor: 'var(--border)' }}>
      {itens.map((item) => {
        const ativo = view === item.id;
        return (
          <button key={item.id} onClick={() => setView(item.id)} className="flex flex-col items-center gap-0.5 py-2 flex-1"
            style={{ color: ativo ? 'var(--primary)' : 'var(--ink-soft)' }}>
            <item.icone size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================== TELA: LOGIN ============================== */

function LoginView({ auth, onEntrar, onRecuperarVendedor }) {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [novoLogin, setNovoLogin] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  function entrar() {
    setErro('');
    const loginDigitos = onlyDigits(login);
    if (auth.admin.cpf && loginDigitos.length === 11 && loginDigitos === onlyDigits(auth.admin.cpf)) {
      setModoRecuperacao(true);
      return;
    }
    if (login === auth.admin.login && senha === auth.admin.senha) {
      onEntrar({ role: 'admin', login });
      return;
    }
    if (login === auth.vendedor.login && senha === auth.vendedor.senha) {
      onEntrar({ role: 'vendedor', login });
      return;
    }
    setErro('Login ou senha incorretos');
  }

  function salvarRecuperacao() {
    if (!novoLogin || !novaSenha) return;
    onRecuperarVendedor({ login: novoLogin, senha: novaSenha.slice(0, 8) });
    onEntrar({ role: 'admin', login: auth.admin.login });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="card p-6 w-full max-w-sm">
        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--primary)' }}>
            <Lock size={20} style={{ color: '#fff' }} />
          </div>
          <h1 className="text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Entrar no sistema</h1>
        </div>

        {modoRecuperacao ? (
          <>
            <p className="text-xs mb-4" style={{ color: 'var(--ink-soft)' }}>CPF do administrador reconhecido. Defina um novo login e senha para o vendedor.</p>
            <InputField label="Novo login do vendedor" value={novoLogin} onChange={(e) => setNovoLogin(e.target.value.slice(0, 11))} />
            <InputField label="Nova senha (até 8 caracteres)" type="password" maxLength={8} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value.slice(0, 8))} />
            <button onClick={salvarRecuperacao} className="btn-primary w-full mt-2">Salvar e entrar como administrador</button>
            <button onClick={() => { setModoRecuperacao(false); setLogin(''); }} className="text-xs mt-3 w-full text-center" style={{ color: 'var(--ink-soft)' }}>Cancelar</button>
          </>
        ) : (
          <>
            <InputField label="Login" value={login} onChange={(e) => setLogin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && entrar()} />
            <InputField label="Senha" type="password" maxLength={8} value={senha} onChange={(e) => setSenha(e.target.value.slice(0, 8))} onKeyDown={(e) => e.key === 'Enter' && entrar()} />
            {erro && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{erro}</p>}
            <button onClick={entrar} className="btn-primary w-full">Entrar</button>
            <p className="text-[11px] mt-4 text-center" style={{ color: 'var(--ink-soft)' }}>Esqueceu o login do vendedor? O administrador digita seu próprio CPF (só números) no campo Login para redefinir.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================== TELA: PDV (VENDER) ============================== */

function PDVView({ produtos, clientes, categorias, empresa, promocoes, role, caixaAberto, onAbrirCaixa, onFinalizarVenda }) {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [modoVisual, setModoVisual] = useState(true);
  const [carrinho, setCarrinho] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAbrirCaixa, setShowAbrirCaixa] = useState(false);
  const inputRef = useRef(null);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      const bateCategoria = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
      if (!bateCategoria) return false;
      if (!termo) return true;
      return p.codigo.toLowerCase().includes(termo) || p.nome.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo);
    });
  }, [produtos, busca, categoriaFiltro]);

  function adicionarAoCarrinho(produto) {
    if (produto.quantidade <= 0) return;
    const promo = promocaoAtiva(produto.id, promocoes);
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produtoId === produto.id);
      if (existe) {
        if (existe.quantidade >= produto.quantidade) return prev;
        return prev.map((i) => (i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      }
      return [...prev, { produtoId: produto.id, nome: produto.nome, codigo: produto.codigo, precoUnitario: produto.precoVenda, quantidade: 1, percentualPromo: promo ? promo.percentual : 0 }];
    });
  }

  function handleBuscaEnter(e) {
    if (e.key !== 'Enter') return;
    const termo = busca.trim().toLowerCase();
    const exato = produtos.find((p) => p.codigo.toLowerCase() === termo);
    if (exato) {
      adicionarAoCarrinho(exato);
      setBusca('');
    } else if (produtosFiltrados.length === 1) {
      adicionarAoCarrinho(produtosFiltrados[0]);
      setBusca('');
    }
  }

  function alterarQuantidade(produtoId, delta) {
    setCarrinho((prev) => {
      const produto = produtos.find((p) => p.id === produtoId);
      return prev
        .map((i) => {
          if (i.produtoId !== produtoId) return i;
          const nova = i.quantidade + delta;
          if (produto && nova > produto.quantidade) return i;
          return { ...i, quantidade: nova };
        })
        .filter((i) => i.quantidade > 0);
    });
  }

  function removerItem(produtoId) {
    setCarrinho((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  const totalBruto = carrinho.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
  const totalPromo = carrinho.reduce((s, i) => s + i.precoUnitario * i.quantidade * ((i.percentualPromo || 0) / 100), 0);
  const total = totalBruto - totalPromo;

  function limparVenda() {
    setCarrinho([]);
    setShowCheckout(false);
  }

  if (!caixaAberto) {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6 flex items-center justify-center" style={{ minHeight: '70vh' }}>
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'var(--bg)' }}>
            <Wallet size={26} style={{ color: 'var(--ink-soft)' }} />
          </div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>Abra o caixa para começar a vender</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>Informe o fundo de troco inicial do dia. Assim que o caixa for aberto, você volta direto para a tela de venda.</p>
          <button onClick={() => setShowAbrirCaixa(true)} className="btn-primary w-full">Abrir caixa</button>
        </div>
        {showAbrirCaixa && (
          <AbrirCaixaForm onClose={() => setShowAbrirCaixa(false)} onSalvar={(valor) => { onAbrirCaixa(valor); setShowAbrirCaixa(false); }} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
            <input
              ref={inputRef}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={handleBuscaEnter}
              placeholder="Código de barras, nome ou descrição..."
              className="campo pl-10"
              autoFocus
            />
          </div>
          <div className="flex rounded-lg overflow-hidden border shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setModoVisual(true)} className="px-3 py-2" style={{ background: modoVisual ? 'var(--ink)' : '#fff', color: modoVisual ? '#fff' : 'var(--ink-soft)' }}><Grid3x3 size={16} /></button>
            <button onClick={() => setModoVisual(false)} className="px-3 py-2" style={{ background: !modoVisual ? 'var(--ink)' : '#fff', color: !modoVisual ? '#fff' : 'var(--ink-soft)' }}><ListIcon size={16} /></button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-1 -mx-1 px-1">
          {['Todas', ...categorias.map((c) => c.nome)].map((c) => (
            <button key={c} onClick={() => setCategoriaFiltro(c)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 border"
              style={categoriaFiltro === c
                ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                : { background: '#fff', color: 'var(--ink-soft)', borderColor: 'var(--border)' }}>
              {c}
            </button>
          ))}
        </div>

        {produtosFiltrados.length === 0 ? (
          <EmptyState icone={Package} titulo="Nenhum produto encontrado" subtitulo="Tente buscar por outro código, nome ou categoria." />
        ) : modoVisual ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {produtosFiltrados.map((p) => {
              const promo = promocaoAtiva(p.id, promocoes);
              return (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} disabled={p.quantidade <= 0}
                  className="card text-left overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group relative">
                  {promo && <div className="absolute top-1.5 left-1.5 z-10"><PromoBadge percentual={promo.percentual} /></div>}
                  <div className="aspect-square w-full flex items-center justify-center" style={{ background: categoryColor(p.categoria) + '1A' }}>
                    {p.imagemUrl ? (
                      <img src={p.imagemUrl} alt={p.nome} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={26} style={{ color: categoryColor(p.categoria) }} />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium leading-snug line-clamp-2 mb-1" style={{ color: 'var(--ink)' }}>{p.nome}</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>{formatBRL(promo ? p.precoVenda * (1 - promo.percentual / 100) : p.precoVenda)}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: p.quantidade <= 0 ? 'var(--danger)' : 'var(--ink-soft)' }}>
                      {p.quantidade <= 0 ? 'Sem estoque' : `${p.quantidade} em estoque`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {produtosFiltrados.map((p) => {
              const promo = promocaoAtiva(p.id, promocoes);
              return (
                <button key={p.id} onClick={() => adicionarAoCarrinho(p)} disabled={p.quantidade <= 0}
                  className="card w-full flex items-center gap-3 p-3 text-left disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: categoryColor(p.categoria) + '1A' }}>
                    {p.imagemUrl ? <img src={p.imagemUrl} className="w-full h-full object-cover rounded-lg" alt="" /> : <ImageIcon size={18} style={{ color: categoryColor(p.categoria) }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{p.nome}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.codigo} · {p.quantidade <= 0 ? 'sem estoque' : `${p.quantidade} un.`}</p>
                  </div>
                  {promo && <PromoBadge percentual={promo.percentual} />}
                  <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--primary)' }}>{formatBRL(p.precoVenda)}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="lg:w-80 shrink-0">
        <div className="card p-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
              <ShoppingCart size={17} /> Carrinho
            </h3>
            {carrinho.length > 0 && <button onClick={limparVenda} className="text-xs" style={{ color: 'var(--danger)' }}>Limpar</button>}
          </div>

          {carrinho.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--ink-soft)' }}>Busque ou toque em um produto para adicionar à venda.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto pr-1">
              {carrinho.map((item) => (
                <div key={item.produtoId} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{item.nome}</p>
                    <p className="text-[11px] flex items-center gap-1" style={{ color: 'var(--ink-soft)' }}>
                      {formatBRL(item.precoUnitario)} un.
                      {item.percentualPromo > 0 && <span style={{ color: 'var(--success)' }}>· -{item.percentualPromo}%</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => alterarQuantidade(item.produtoId, -1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--bg)' }}><Minus size={12} /></button>
                    <span className="text-xs w-4 text-center">{item.quantidade}</span>
                    <button onClick={() => alterarQuantidade(item.produtoId, 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--bg)' }}><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removerItem(item.produtoId)} className="shrink-0"><Trash2 size={14} style={{ color: 'var(--danger)' }} /></button>
                </div>
              ))}
            </div>
          )}

          {totalPromo > 0 && (
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--success)' }}>
              <span>Desconto de campanha</span>
              <span>-{formatBRL(totalPromo)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t mb-4" style={{ borderColor: 'var(--border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>Total</span>
            <span className="text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{formatBRL(total)}</span>
          </div>

          <button onClick={() => setShowCheckout(true)} disabled={carrinho.length === 0} className="btn-primary w-full disabled:opacity-40">
            Finalizar venda
          </button>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          carrinho={carrinho}
          total={total}
          clientes={clientes}
          empresa={empresa}
          role={role}
          onClose={() => setShowCheckout(false)}
          onConcluir={(dados) => {
            onFinalizarVenda({ carrinho, ...dados });
            limparVenda();
          }}
        />
      )}
    </div>
  );
}

function ReciboDocumento({ venda, carrinho, empresa, cliente }) {
  const subtotalBruto = carrinho.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
  const descontoPromo = carrinho.reduce((s, i) => s + i.precoUnitario * i.quantidade * ((i.percentualPromo || 0) / 100), 0);
  const descontoAdicionalValor = Math.max(0, subtotalBruto - descontoPromo - venda.total);
  const pagamentoTexto = venda.formaPagamento === 'misto' && venda.pagamentos
    ? venda.pagamentos.map((p) => `${labelFormaPagamento(p.forma, venda.parcelasCredito)} ${formatBRL(p.valor)}`).join(' + ')
    : labelFormaPagamento(venda.formaPagamento, venda.parcelasCredito);

  return (
    <div id="recibo-print" className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      <div className="px-6 py-5 flex items-center justify-between gap-3" style={{ background: 'var(--ink)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {empresa.logoUrl ? <img src={empresa.logoUrl} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}><Sparkles size={18} style={{ color: 'var(--ink)' }} /></div>}
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate" style={{ fontFamily: 'var(--font-display)' }}>{empresa.nome || 'Minha Loja'}</p>
            {empresa.cnpj && <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>CNPJ {empresa.cnpj}</p>}
            {empresa.telefone && <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>{empresa.telefone}</p>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Comprovante</p>
          <p className="text-white text-sm font-medium">{venda.numero}</p>
        </div>
      </div>

      <div className="px-6 py-5" style={{ background: '#fff' }}>
        <div className="flex justify-between mb-4 pb-4 border-b flex-wrap gap-3" style={{ borderColor: 'var(--border)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--ink-soft)' }}>Cliente</p>
            <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{venda.clienteNome}</p>
            {cliente?.cpf && <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>CPF {formatCPF(cliente.cpf)}</p>}
            {cliente?.email && <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{cliente.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--ink-soft)' }}>Data</p>
            <p className="text-sm" style={{ color: 'var(--ink)' }}>{formatDateBR(new Date().toISOString())}</p>
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm mb-4 px-1">
            <thead>
              <tr className="text-left" style={{ color: 'var(--ink-soft)' }}>
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 font-medium text-center">Qtd</th>
                <th className="pb-2 font-medium text-right">Unit.</th>
                <th className="pb-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {carrinho.map((i) => (
                <tr key={i.produtoId} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-2" style={{ color: 'var(--ink)' }}>{i.nome}{i.percentualPromo > 0 && <span className="ml-1.5 text-[11px]" style={{ color: 'var(--success)' }}>-{i.percentualPromo}%</span>}</td>
                  <td className="py-2 text-center" style={{ color: 'var(--ink-soft)' }}>{i.quantidade}</td>
                  <td className="py-2 text-right whitespace-nowrap" style={{ color: 'var(--ink-soft)' }}>{formatBRL(i.precoUnitario)}</td>
                  <td className="py-2 text-right font-medium whitespace-nowrap" style={{ color: 'var(--ink)' }}>{formatBRL(i.precoUnitario * i.quantidade * (1 - (i.percentualPromo || 0) / 100))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 pt-3 border-t text-sm" style={{ borderColor: 'var(--border)' }}>
          <div className="flex justify-between"><span style={{ color: 'var(--ink-soft)' }}>Subtotal</span><span style={{ color: 'var(--ink)' }}>{formatBRL(subtotalBruto)}</span></div>
          {descontoPromo > 0 && <div className="flex justify-between"><span style={{ color: 'var(--success)' }}>Desconto de campanha</span><span style={{ color: 'var(--success)' }}>-{formatBRL(descontoPromo)}</span></div>}
          {descontoAdicionalValor > 0.005 && <div className="flex justify-between"><span style={{ color: 'var(--success)' }}>Desconto adicional{venda.descontoAdicional ? ` (${venda.descontoAdicional}%)` : ''}</span><span style={{ color: 'var(--success)' }}>-{formatBRL(descontoAdicionalValor)}</span></div>}
          <div className="flex justify-between text-base font-semibold pt-1.5 mt-1.5 border-t" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}>
            <span>Total</span><span style={{ fontFamily: 'var(--font-display)' }}>{formatBRL(venda.total)}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
          <p>Forma de pagamento: {pagamentoTexto}</p>
          {venda.notaFiscal?.solicitada && <p className="mt-1">Nota fiscal paulista solicitada — CPF informado para abatimento.</p>}
        </div>
      </div>

      <div className="px-6 py-3 text-center text-[11px]" style={{ background: 'var(--bg)', color: 'var(--ink-soft)' }}>
        Este comprovante não substitui a nota fiscal eletrônica oficial · Obrigado pela preferência
      </div>
    </div>
  );
}

function EnvioReciboAcoes({ cliente, empresa, textoRecibo, assunto, onConcluir }) {
  const [statusEmail, setStatusEmail] = useState(cliente?.email ? 'pendente' : 'sememail');
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState('');
  const emailjsConfigurado = !!(empresa.emailjsServiceId && empresa.emailjsTemplateId && empresa.emailjsPublicKey);

  useEffect(() => {
    if (!cliente?.email) { setStatusEmail('sememail'); return; }
    if (!emailjsConfigurado) { setStatusEmail('naoconfigurado'); return; }
    setStatusEmail('enviando');
    enviarViaEmailJS(empresa, { to_email: cliente.email, to_name: cliente.nome, subject: assunto, message: textoRecibo })
      .then(() => setStatusEmail('enviado'))
      .catch(() => setStatusEmail('falhou'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function compartilharComoImagem() {
    setGerandoImagem(true);
    setErroImagem('');
    try {
      const blob = await gerarImagemRecibo();
      const file = new File([blob], `comprovante-${Date.now()}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Comprovante de compra', text: 'Segue o comprovante da sua compra.' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setErroImagem('Não foi possível gerar a imagem agora. Use as opções de texto abaixo.');
    } finally {
      setGerandoImagem(false);
    }
  }

  function baixarComoPDF() {
    window.print();
  }

  function enviarWhatsAppManual() {
    const texto = encodeURIComponent(textoRecibo);
    const tel = cliente ? onlyDigits(cliente.telefone) : '';
    const url = tel ? `https://wa.me/55${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
  }
  function enviarEmailManual() {
    const texto = encodeURIComponent(textoRecibo);
    const destino = cliente?.email || '';
    window.location.href = `mailto:${destino}?subject=${encodeURIComponent(assunto)}&body=${texto}`;
  }

  return (
    <div className="mt-4">
      {statusEmail === 'enviando' && <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'var(--ink-soft)' }}><RefreshCw size={12} className="animate-spin" /> Enviando e-mail automaticamente para {cliente.email}...</p>}
      {statusEmail === 'enviado' && <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'var(--success)' }}><Check size={12} /> E-mail enviado automaticamente para {cliente.email}</p>}
      {statusEmail === 'falhou' && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>Não foi possível enviar automaticamente agora. Use o botão abaixo.</p>}
      {statusEmail === 'naoconfigurado' && <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>Envio automático não configurado ainda — configure em Ajustes, ou envie manualmente abaixo.</p>}
      {erroImagem && <p className="text-xs mb-3" style={{ color: 'var(--danger)' }}>{erroImagem}</p>}

      <div className="space-y-2">
        <button onClick={compartilharComoImagem} disabled={gerandoImagem} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
          {gerandoImagem ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />} Compartilhar comprovante (imagem)
        </button>
        <button onClick={baixarComoPDF} className="btn-secondary w-full flex items-center justify-center gap-2">
          <FileText size={16} /> Salvar como PDF
        </button>
        <p className="text-[11px] text-center" style={{ color: 'var(--ink-soft)' }}>ou envie como texto:</p>
        <button onClick={enviarWhatsAppManual} className="btn-secondary w-full flex items-center justify-center gap-2"><MessageCircle size={16} /> WhatsApp (texto)</button>
        {statusEmail !== 'enviado' && (
          <button onClick={enviarEmailManual} className="btn-secondary w-full flex items-center justify-center gap-2"><Mail size={16} /> E-mail (texto)</button>
        )}
      </div>
      <button onClick={onConcluir} className="btn-primary w-full mt-3">Nova venda</button>
    </div>
  );
}

function CheckoutModal({ carrinho, total, clientes, empresa, role, onClose, onConcluir }) {
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [querNota, setQuerNota] = useState(false);
  const [cpfNota, setCpfNota] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [mesclar, setMesclar] = useState(false);
  const [valoresMistos, setValoresMistos] = useState({ debito: '', credito: '', pix: '', dinheiro: '' });
  const [descontoAdicional, setDescontoAdicional] = useState('');
  const [parcelasCredito, setParcelasCredito] = useState(1);
  const [concluida, setConcluida] = useState(null);
  const buscaClienteRef = useRef(null);

  const totalFinal = total * (1 - (role === 'admin' ? (parseFloat(descontoAdicional) || 0) : 0) / 100);
  const somaMista = Object.values(valoresMistos).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const diferencaMista = Math.round((totalFinal - somaMista) * 100) / 100;
  const pagamentoValido = !mesclar || diferencaMista === 0;

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    if (!termo) return [];
    return clientes.filter((c) =>
      `${c.nome} ${c.sobrenome}`.toLowerCase().includes(termo) ||
      onlyDigits(c.telefone).includes(onlyDigits(termo)) ||
      onlyDigits(c.cpf).includes(onlyDigits(termo))
    ).slice(0, 5);
  }, [clientes, buscaCliente]);

  function selecionarCliente(c) {
    setClienteSelecionado(c);
    setBuscaCliente(`${c.nome} ${c.sobrenome}`);
    setQuerNota(!!c.querNotaFiscal);
    setCpfNota(c.cpf || '');
  }

  function confirmar() {
    if (!pagamentoValido) return;
    const pagamentos = mesclar
      ? Object.entries(valoresMistos).filter(([, v]) => parseFloat(v) > 0).map(([forma, v]) => ({ forma, valor: parseFloat(v) }))
      : null;
    const venda = {
      clienteId: clienteSelecionado ? clienteSelecionado.id : null,
      clienteNome: clienteSelecionado ? `${clienteSelecionado.nome} ${clienteSelecionado.sobrenome}` : 'Venda avulsa',
      numero: 'REC' + Date.now().toString().slice(-8),
      formaPagamento: mesclar ? 'misto' : formaPagamento,
      parcelasCredito: (mesclar ? parseFloat(valoresMistos.credito) > 0 : formaPagamento === 'credito') ? parcelasCredito : 1,
      pagamentos,
      total: totalFinal,
      descontoAdicional: role === 'admin' ? (parseFloat(descontoAdicional) || 0) : 0,
      notaFiscal: { solicitada: querNota, cpf: cpfNota, enviada: false, canal: null },
    };
    setConcluida(venda);
  }

  const confirmarRef = useRef(confirmar);
  confirmarRef.current = confirmar;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Enter') {
        if (document.activeElement === buscaClienteRef.current) return;
        if (concluida) return;
        e.preventDefault();
        confirmarRef.current();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (concluida) onConcluir(concluida);
        else onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [concluida, onClose, onConcluir]);

  function reciboTexto(venda) {
    const linhas = carrinho.map((i) => `${i.quantidade}x ${i.nome} — ${formatBRL(i.precoUnitario * i.quantidade * (1 - (i.percentualPromo || 0) / 100))}${i.percentualPromo ? ` (promo -${i.percentualPromo}%)` : ''}`);
    const pagamentoTexto = venda.formaPagamento === 'misto' && venda.pagamentos
      ? venda.pagamentos.map((p) => `${labelFormaPagamento(p.forma, venda.parcelasCredito)} ${formatBRL(p.valor)}`).join(' + ')
      : labelFormaPagamento(venda.formaPagamento, venda.parcelasCredito);
    return [
      `Recibo de compra — ${empresa.nome || 'Loja'}`,
      `Data: ${formatDateBR(new Date().toISOString())}`,
      `Cliente: ${venda.clienteNome}`,
      '',
      ...linhas,
      '',
      venda.descontoAdicional > 0 ? `Desconto adicional: ${venda.descontoAdicional}%` : '',
      `Total: ${formatBRL(venda.total)}`,
      `Forma de pagamento: ${pagamentoTexto}`,
      venda.notaFiscal.solicitada ? `Nota fiscal paulista solicitada — CPF: ${venda.notaFiscal.cpf || 'não informado'}` : '',
      '',
      'Este recibo é gerado pelo sistema interno da loja e não substitui a nota fiscal eletrônica oficial.',
    ].filter(Boolean).join('\n');
  }

  if (concluida) {
    return (
      <Modal onClose={() => onConcluir(concluida)} title="Venda finalizada" wide>
        <ReciboDocumento venda={concluida} carrinho={carrinho} empresa={empresa} cliente={clienteSelecionado} />
        <EnvioReciboAcoes cliente={clienteSelecionado} empresa={empresa} textoRecibo={reciboTexto(concluida)} assunto={`Comprovante da compra — ${empresa.nome || 'Loja'}`} onConcluir={() => onConcluir(concluida)} />
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} title="Fechar venda" wide>
      <div className="mb-5">
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Cliente (opcional)</p>
        <div className="relative">
          <input ref={buscaClienteRef} value={buscaCliente} onChange={(e) => { setBuscaCliente(e.target.value); setClienteSelecionado(null); }}
            placeholder="Buscar por nome, telefone ou CPF..." className="campo" />
          {clientesFiltrados.length > 0 && !clienteSelecionado && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {clientesFiltrados.map((c) => (
                <button key={c.id} onClick={() => selecionarCliente(c)} className="w-full text-left px-3 py-2 text-sm hover:bg-black/5">
                  {c.nome} {c.sobrenome} <span style={{ color: 'var(--ink-soft)' }}>· {c.telefone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {!clienteSelecionado && <p className="text-[11px] mt-1" style={{ color: 'var(--ink-soft)' }}>Deixe em branco para uma venda avulsa.</p>}
      </div>

      <div className="mb-5 flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Nota fiscal paulista</p>
          <p className="text-[11px]" style={{ color: 'var(--ink-soft)' }}>Gera um recibo com o CPF para abatimento</p>
        </div>
        <input type="checkbox" checked={querNota} onChange={(e) => setQuerNota(e.target.checked)} className="w-5 h-5" />
      </div>
      {querNota && (
        <InputField label="CPF do cliente" value={formatCPF(cpfNota)} onChange={(e) => setCpfNota(onlyDigits(e.target.value))} placeholder="000.000.000-00" />
      )}

      <div className="flex items-center justify-between mb-2 mt-2">
        <p className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>Forma de pagamento</p>
        <button type="button" onClick={() => setMesclar(!mesclar)} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
          {mesclar ? 'Usar uma única forma' : '+ Mesclar formas de pagamento'}
        </button>
      </div>

      {!mesclar ? (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            {FORMAS_PAGAMENTO.map((f) => (
              <button key={f.id} onClick={() => setFormaPagamento(f.id)}
                className="flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium"
                style={formaPagamento === f.id ? { borderColor: 'var(--primary)', background: 'var(--primary)10', color: 'var(--primary)' } : { borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
                <f.icone size={16} /> {f.label}
              </button>
            ))}
          </div>
          {formaPagamento === 'credito' && (
            <label className="block mt-3">
              <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Parcelamento (sem juros)</span>
              <select value={parcelasCredito} onChange={(e) => setParcelasCredito(parseInt(e.target.value))} className="campo">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}x de ${formatBRL(totalFinal / n)} sem juros`}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3 mb-2">
            {FORMAS_PAGAMENTO.map((f) => (
              <label key={f.id} className="block">
                <span className="text-xs flex items-center gap-1 mb-1" style={{ color: 'var(--ink-soft)' }}><f.icone size={13} /> {f.label}</span>
                <input type="number" min="0" step="0.01" value={valoresMistos[f.id]}
                  onChange={(e) => setValoresMistos({ ...valoresMistos, [f.id]: e.target.value })}
                  placeholder="0,00" className="campo" />
                {f.id === 'credito' && parseFloat(valoresMistos.credito) > 0 && (
                  <select value={parcelasCredito} onChange={(e) => setParcelasCredito(parseInt(e.target.value))} className="campo mt-1.5">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `${n}x sem juros`}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs px-1">
            <span style={{ color: 'var(--ink-soft)' }}>Alocado: {formatBRL(somaMista)} de {formatBRL(totalFinal)}</span>
            {diferencaMista !== 0 && (
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{diferencaMista > 0 ? `Falta ${formatBRL(diferencaMista)}` : `Excedeu ${formatBRL(Math.abs(diferencaMista))}`}</span>
            )}
          </div>
        </div>
      )}

      {role === 'admin' && (
        <label className="block mb-4">
          <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Desconto adicional (%) — apenas administrador</span>
          <input type="number" min="0" max="100" value={descontoAdicional} onChange={(e) => setDescontoAdicional(e.target.value)} placeholder="0" className="campo" />
        </label>
      )}

      <div className="space-y-1 pt-3 border-t mb-4" style={{ borderColor: 'var(--border)' }}>
        {total !== totalFinal && (
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-soft)' }}>
            <span>Subtotal</span><span>{formatBRL(total)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>Total a cobrar</span>
          <span className="text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{formatBRL(totalFinal)}</span>
        </div>
      </div>
      <button onClick={confirmar} disabled={!pagamentoValido} className="btn-primary w-full disabled:opacity-40">Confirmar venda</button>
      <p className="text-[11px] text-center mt-2" style={{ color: 'var(--ink-soft)' }}>Enter confirma · Esc cancela</p>
    </Modal>
  );
}

/* ============================== TELA: PRODUTOS ============================== */

function ProdutoForm({ produto, categorias, onSalvar, onClose }) {
  const [form, setForm] = useState(produto || {
    codigo: '', nome: '', descricao: '', categoria: categorias[0]?.nome || '', subcategoria: '', precoCusto: '', precoVenda: '',
    quantidade: '', estoqueIdeal: '', dataEntrada: todayISODate(), imagemUrl: null,
  });
  const [showScanner, setShowScanner] = useState(false);

  const subcategoriasDisponiveis = categorias.find((c) => c.nome === form.categoria)?.subcategorias;

  function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imagemUrl: reader.result }));
    reader.readAsDataURL(file);
  }

  function salvar() {
    if (!form.nome || !form.codigo) return;
    onSalvar({
      ...form,
      id: form.id || uid('p'),
      subcategoria: subcategoriasDisponiveis ? form.subcategoria : '',
      precoCusto: parseFloat(form.precoCusto) || 0,
      precoVenda: parseFloat(form.precoVenda) || 0,
      quantidade: parseInt(form.quantidade) || 0,
      estoqueIdeal: parseInt(form.estoqueIdeal) || 0,
    });
  }

  return (
    <Modal onClose={onClose} title={produto ? 'Editar produto' : 'Novo produto'} wide>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'var(--bg)' }}>
          {form.imagemUrl ? <img src={form.imagemUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon size={22} style={{ color: 'var(--ink-soft)' }} />}
        </div>
        <label className="btn-secondary cursor-pointer text-sm">
          <Upload size={14} className="inline mr-1.5" /> Foto do produto
          <input type="file" accept="image/*" className="hidden" onChange={upload} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <label className="block mb-3">
          <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Código / código de barras</span>
          <div className="flex gap-2">
            <input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="campo" />
            <button type="button" onClick={() => setShowScanner(true)} className="btn-secondary px-3 shrink-0" title="Escanear com a câmera"><Camera size={16} /></button>
          </div>
        </label>
        <label className="block mb-3">
          <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Categoria</span>
          <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value, subcategoria: '' })} className="campo">
            {categorias.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
          </select>
        </label>
      </div>
      {subcategoriasDisponiveis && (
        <label className="block mb-3">
          <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Campanha</span>
          <select value={form.subcategoria} onChange={(e) => setForm({ ...form, subcategoria: e.target.value })} className="campo">
            <option value="">Selecione a campanha</option>
            {subcategoriasDisponiveis.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      <InputField label="Nome do produto" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
      <InputField label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
      <div className="grid grid-cols-2 gap-x-4">
        <InputField label="Preço de custo (R$)" type="number" value={form.precoCusto} onChange={(e) => setForm({ ...form, precoCusto: e.target.value })} />
        <InputField label="Preço de venda (R$)" type="number" value={form.precoVenda} onChange={(e) => setForm({ ...form, precoVenda: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <InputField label="Quantidade em estoque" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
        <InputField label="Estoque ideal" type="number" value={form.estoqueIdeal} onChange={(e) => setForm({ ...form, estoqueIdeal: e.target.value })} />
      </div>
      <InputField label="Data de entrada no estoque" type="date" value={form.dataEntrada} onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })} />
      <button onClick={salvar} className="btn-primary w-full mt-2">Salvar produto</button>

      {showScanner && (
        <ScannerModal onClose={() => setShowScanner(false)} onDetected={(codigo) => { setForm((f) => ({ ...f, codigo })); setShowScanner(false); }} />
      )}
    </Modal>
  );
}

function ProdutosView({ produtos, categorias, role, onSalvar, onExcluir }) {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [editando, setEditando] = useState(null);
  const [novo, setNovo] = useState(false);
  const [excluir, setExcluir] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const podeEditar = role === 'admin';

  const filtrados = produtos.filter((p) => {
    const bateCategoria = categoriaFiltro === 'Todas' || p.categoria === categoriaFiltro;
    const termo = busca.trim().toLowerCase();
    return bateCategoria && (!termo || p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo));
  });

  function handleCodigoEscaneado(codigo) {
    setShowScanner(false);
    const existente = produtos.find((p) => p.codigo === codigo);
    if (existente) {
      if (podeEditar) setEditando(existente);
      else setBusca(codigo);
    } else if (podeEditar) {
      setEditando({ codigo, nome: '', descricao: '', categoria: categorias[0]?.nome || '', subcategoria: '', precoCusto: '', precoVenda: '', quantidade: '', estoqueIdeal: '', dataEntrada: todayISODate(), imagemUrl: null, __novo: true });
    } else {
      setBusca(codigo);
    }
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Produtos</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowScanner(true)} className="btn-secondary flex items-center gap-1.5 justify-center"><Camera size={16} /> Escanear</button>
          {podeEditar && <button onClick={() => setNovo(true)} className="btn-primary flex items-center gap-1.5 justify-center"><Plus size={16} /> Novo produto</button>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className="campo pl-9" />
        </div>
        <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="campo sm:w-56">
          <option>Todas</option>
          {categorias.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icone={Package} titulo="Nenhum produto cadastrado" subtitulo="Cadastre seu primeiro produto para começar a vender." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Produto</th>
                  <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Categoria</th>
                  <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Preço</th>
                  <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}>Estoque</th>
                  {podeEditar && <th className="px-4 py-3 font-medium" style={{ color: 'var(--ink-soft)' }}></th>}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--ink)' }}>{p.nome}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.codigo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge" style={{ background: categoryColor(p.categoria) + '1A', color: categoryColor(p.categoria) }}>{p.subcategoria || p.categoria}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>{formatBRL(p.precoVenda)}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs mb-1" style={{ color: 'var(--ink)' }}>{p.quantidade} un.</p>
                      <StockBadge produto={p} />
                    </td>
                    {podeEditar && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditando(p)} className="text-xs font-medium mr-3" style={{ color: 'var(--primary)' }}>Editar</button>
                        <button onClick={() => setExcluir(p)} className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Excluir</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {podeEditar && (novo || editando) && (
        <ProdutoForm produto={editando && !editando.__novo ? editando : (editando && editando.__novo ? { ...editando, id: undefined } : null)} categorias={categorias}
          onSalvar={(p) => { onSalvar(p); setNovo(false); setEditando(null); }}
          onClose={() => { setNovo(false); setEditando(null); }} />
      )}
      {excluir && (
        <ConfirmDialog texto={`Excluir "${excluir.nome}" do catálogo?`}
          onCancelar={() => setExcluir(null)}
          onConfirmar={() => { onExcluir(excluir.id); setExcluir(null); }} />
      )}
      {showScanner && <ScannerModal onClose={() => setShowScanner(false)} onDetected={handleCodigoEscaneado} />}
    </div>
  );
}

/* ============================== TELA: CLIENTES ============================== */

function ClienteForm({ cliente, onSalvar, onClose }) {
  const [form, setForm] = useState(cliente || { nome: '', sobrenome: '', telefone: '', email: '', cpf: '', cep: '', endereco: '', observacao: '', querNotaFiscal: false });
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');

  async function buscarCep(valor) {
    const cepLimpo = onlyDigits(valor);
    setForm((f) => ({ ...f, cep: cepLimpo }));
    setErroCep('');
    if (cepLimpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const dados = await resp.json();
      if (dados.erro) {
        setErroCep('CEP não encontrado');
      } else {
        const partes = [dados.logradouro, dados.bairro, dados.localidade && dados.uf ? `${dados.localidade} - ${dados.uf}` : dados.localidade].filter(Boolean);
        setForm((f) => ({ ...f, endereco: partes.join(', ') }));
      }
    } catch (e) {
      setErroCep('Não foi possível buscar o CEP agora');
    } finally {
      setBuscandoCep(false);
    }
  }

  function formatCEP(v) {
    const d = onlyDigits(v).slice(0, 8);
    return d.replace(/(\d{5})(\d)/, '$1-$2');
  }

  function salvar() {
    if (!form.nome) return;
    onSalvar({ ...form, id: form.id || uid('c') });
  }

  return (
    <Modal onClose={onClose} title={cliente ? 'Editar cliente' : 'Novo cliente'}>
      <div className="grid grid-cols-2 gap-x-4">
        <InputField label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <InputField label="Sobrenome" value={form.sobrenome} onChange={(e) => setForm({ ...form, sobrenome: e.target.value })} />
      </div>
      <InputField label="Telefone / WhatsApp" value={formatTelefone(form.telefone)} onChange={(e) => setForm({ ...form, telefone: onlyDigits(e.target.value) })} placeholder="(11) 90000-0000" />
      <InputField label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <InputField label="CPF" value={formatCPF(form.cpf)} onChange={(e) => setForm({ ...form, cpf: onlyDigits(e.target.value) })} placeholder="000.000.000-00" />
      <label className="block mb-3">
        <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>CEP</span>
        <div className="relative">
          <input value={formatCEP(form.cep || '')} onChange={(e) => buscarCep(e.target.value)} placeholder="00000-000" className="campo" inputMode="numeric" />
          {buscandoCep && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--ink-soft)' }}>buscando...</span>}
        </div>
        {erroCep && <span className="block text-xs mt-1" style={{ color: 'var(--danger)' }}>{erroCep}</span>}
      </label>
      <InputField label="Endereço" value={form.endereco || ''} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Preenchido automaticamente pelo CEP, ou digite" />
      <label className="block mb-3">
        <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>Observação</span>
        <textarea rows={3} value={form.observacao || ''} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Preferências, combinados, histórico relevante..." className="campo" style={{ resize: 'vertical' }} />
      </label>
      <label className="flex items-center gap-2 mb-4 mt-1">
        <input type="checkbox" checked={form.querNotaFiscal} onChange={(e) => setForm({ ...form, querNotaFiscal: e.target.checked })} className="w-4 h-4" />
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>Costuma pedir nota fiscal paulista</span>
      </label>
      <button onClick={salvar} className="btn-primary w-full">Salvar cliente</button>
    </Modal>
  );
}

function ClientesView({ clientes, vendas, onSalvar, onExcluir }) {
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluir, setExcluir] = useState(null);

  const filtrados = clientes.filter((c) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return `${c.nome} ${c.sobrenome}`.toLowerCase().includes(termo) || onlyDigits(c.telefone).includes(onlyDigits(termo));
  });

  function historico(clienteId) {
    return vendas.filter((v) => v.clienteId === clienteId);
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Clientes</h2>
        <button onClick={() => setNovo(true)} className="btn-primary flex items-center gap-1.5 justify-center"><Plus size={16} /> Novo cliente</button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-soft)' }} />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="campo pl-9" />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icone={Users} titulo="Nenhum cliente cadastrado" subtitulo="Cadastre clientes para agilizar a nota fiscal e o envio de recibos." />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtrados.map((c) => {
            const compras = historico(c.id);
            const totalGasto = compras.reduce((s, v) => s + v.total, 0);
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--primary)1A' }}>
                      <User size={16} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{c.nome} {c.sobrenome}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{c.telefone ? formatTelefone(c.telefone) : 'sem telefone'}</p>
                    </div>
                  </div>
                  {c.querNotaFiscal && <span className="badge" style={{ background: '#EFE7CE', color: '#8A6D1D' }}><FileText size={11} /> NF</span>}
                </div>
                <p className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>{c.email || 'sem e-mail'}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{compras.length} compra(s) · {formatBRL(totalGasto)}</p>
                  <div>
                    <button onClick={() => setEditando(c)} className="text-xs font-medium mr-3" style={{ color: 'var(--primary)' }}>Editar</button>
                    <button onClick={() => setExcluir(c)} className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Excluir</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(novo || editando) && (
        <ClienteForm cliente={editando}
          onSalvar={(c) => { onSalvar(c); setNovo(false); setEditando(null); }}
          onClose={() => { setNovo(false); setEditando(null); }} />
      )}
      {excluir && (
        <ConfirmDialog texto={`Excluir "${excluir.nome} ${excluir.sobrenome}" dos clientes?`}
          onCancelar={() => setExcluir(null)}
          onConfirmar={() => { onExcluir(excluir.id); setExcluir(null); }} />
      )}
    </div>
  );
}

/* ============================== TELA: CAIXA ============================== */

function AbrirCaixaForm({ onClose, onSalvar }) {
  const [valor, setValor] = useState('');
  function salvar() {
    onSalvar(parseFloat(valor) || 0);
  }
  return (
    <Modal onClose={onClose} title="Abrir caixa">
      <InputField label="Fundo de troco inicial (R$)" type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
      <button onClick={salvar} className="btn-primary w-full mt-2">Abrir caixa</button>
    </Modal>
  );
}

function FecharCaixaForm({ caixa, resumo, onClose, onSalvar }) {
  const [valorContado, setValorContado] = useState('');
  const [observacao, setObservacao] = useState('');
  function salvar() {
    onSalvar({ valorContado: parseFloat(valorContado) || 0, observacao });
  }
  return (
    <Modal onClose={onClose} title="Fechar caixa">
      <div className="mb-4 p-3 rounded-lg text-sm space-y-1" style={{ background: 'var(--bg)' }}>
        <div className="flex justify-between"><span style={{ color: 'var(--ink-soft)' }}>Fundo de troco</span><span style={{ color: 'var(--ink)' }}>{formatBRL(caixa.valorAbertura)}</span></div>
        <div className="flex justify-between"><span style={{ color: 'var(--ink-soft)' }}>Vendas em dinheiro</span><span style={{ color: 'var(--ink)' }}>{formatBRL(resumo.porForma.dinheiro || 0)}</span></div>
        <div className="flex justify-between"><span style={{ color: 'var(--ink-soft)' }}>Sangrias</span><span style={{ color: 'var(--ink)' }}>-{formatBRL(resumo.sangriasTotal)}</span></div>
        <div className="flex justify-between font-semibold pt-1 mt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}><span>Esperado em caixa</span><span>{formatBRL(resumo.caixaFisicoEsperado)}</span></div>
      </div>
      <InputField label="Valor contado no caixa (R$)" type="number" value={valorContado} onChange={(e) => setValorContado(e.target.value)} />
      <InputField label="Observação (opcional)" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: nota trocada, gaveta conferida" />
      <button onClick={salvar} className="btn-primary w-full mt-2">Confirmar fechamento</button>
    </Modal>
  );
}

function DiferencaLabel({ diferenca }) {
  if (diferenca === null || diferenca === undefined) return null;
  const arredondado = Math.round(diferenca * 100) / 100;
  if (arredondado === 0) return <span style={{ color: 'var(--success)', fontWeight: 600 }}>Confere</span>;
  return <span style={{ color: arredondado < 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>{arredondado > 0 ? 'Sobra ' : 'Falta '}{formatBRL(Math.abs(arredondado))}</span>;
}

function CaixaView({ caixas, vendas, movimentacoes, role, onAbrir, onFechar, onRegistrarSangria }) {
  const hoje = todayISODate();
  const caixaHoje = caixas.find((c) => c.data === hoje);
  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [dataConsulta, setDataConsulta] = useState(hoje);

  function resumoDoDia(data) {
    const vs = vendas.filter((v) => soData(v.data) === data);
    const porForma = {};
    FORMAS_PAGAMENTO.forEach((f) => (porForma[f.id] = 0));
    vs.forEach((v) => acumularPagamento(v, porForma));
    const receitaTotal = vs.reduce((s, v) => s + v.total, 0);
    const sangriasTotal = (movimentacoes || []).filter((m) => soData(m.data) === data).reduce((s, m) => s + m.valor, 0);
    return { porForma, receitaTotal, sangriasTotal };
  }

  function calcularCaixa(caixa) {
    const r = resumoDoDia(caixa.data);
    const caixaFisicoEsperado = caixa.valorAbertura + (r.porForma.dinheiro || 0) - r.sangriasTotal;
    const diferenca = caixa.valorContado != null ? caixa.valorContado - caixaFisicoEsperado : null;
    return { ...r, caixaFisicoEsperado, diferenca };
  }

  const fechados = caixas.filter((c) => c.status === 'fechado').sort((a, b) => b.data.localeCompare(a.data));

  const vendasHoje = caixaHoje
    ? vendas.filter((v) => soData(v.data) === caixaHoje.data).sort((a, b) => new Date(b.data) - new Date(a.data))
    : [];

  function pagamentoTextoVenda(v) {
    if (v.formaPagamento === 'misto' && v.pagamentos) {
      return v.pagamentos.map((p) => `${labelFormaPagamento(p.forma, v.parcelasCredito).split(' ')[0]} ${formatBRL(p.valor)}`).join(' + ');
    }
    return labelFormaPagamento(v.formaPagamento, v.parcelasCredito);
  }

  const porMes = {};
  fechados.forEach((c) => {
    const mes = c.data.slice(0, 7);
    const calc = calcularCaixa(c);
    if (!porMes[mes]) porMes[mes] = { receita: 0, sangrias: 0, diferenca: 0, dias: 0 };
    porMes[mes].receita += calc.receitaTotal;
    porMes[mes].sangrias += calc.sangriasTotal;
    porMes[mes].diferenca += calc.diferenca || 0;
    porMes[mes].dias += 1;
  });
  const mesesOrdenados = Object.entries(porMes).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Caixa</h2>

      <div className="card p-5 mb-4">
        {!caixaHoje ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Caixa de hoje ainda não foi aberto</p>
              <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{formatDateBR(hoje)}</p>
            </div>
            <button onClick={() => setShowAbrir(true)} className="btn-primary">Abrir caixa</button>
          </div>
        ) : (() => {
          const calc = calcularCaixa(caixaHoje);
          return (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2 flex-wrap" style={{ color: 'var(--ink)' }}>
                    Caixa de {formatDateBR(hoje)}
                    <span className="badge" style={{ background: caixaHoje.status === 'aberto' ? '#E4EEE8' : 'var(--bg)', color: caixaHoje.status === 'aberto' ? 'var(--success)' : 'var(--ink-soft)' }}>
                      {caixaHoje.status === 'aberto' ? 'Aberto' : 'Fechado'}
                    </span>
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Aberto às {new Date(caixaHoje.aberturaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · fundo de troco {formatBRL(caixaHoje.valorAbertura)}</p>
                </div>
                {caixaHoje.status === 'aberto' && (
                  <div className="flex gap-2">
                    {role === 'admin' && <button onClick={() => setShowSangria(true)} className="btn-secondary flex items-center gap-1.5"><Wallet size={14} /> Sangria</button>}
                    <button onClick={() => setShowFechar(true)} className="btn-secondary">Fechar caixa</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Receita do dia" valor={formatBRL(calc.receitaTotal)} icone={TrendingUp} cor="var(--primary)" />
                <KpiCard label="Em dinheiro" valor={formatBRL(calc.porForma.dinheiro || 0)} icone={Banknote} cor="var(--accent)" />
                <KpiCard label="Sangrias do dia" valor={formatBRL(calc.sangriasTotal)} icone={Wallet} cor="var(--danger)" />
                <KpiCard label="Caixa físico esperado" valor={formatBRL(calc.caixaFisicoEsperado)} icone={FileText} cor="var(--success)" />
              </div>
              {caixaHoje.status === 'fechado' && caixaHoje.valorContado != null && (
                <div className="mt-3 pt-3 border-t text-sm" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between"><span style={{ color: 'var(--ink-soft)' }}>Valor contado</span><span style={{ color: 'var(--ink)' }}>{formatBRL(caixaHoje.valorContado)}</span></div>
                  <div className="flex justify-between mt-1"><span style={{ color: 'var(--ink-soft)' }}>Diferença</span><DiferencaLabel diferenca={calc.diferenca} /></div>
                  {caixaHoje.observacaoFechamento && <p className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>{caixaHoje.observacaoFechamento}</p>}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {caixaHoje && (
        <div className="card p-5 mb-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Vendas de hoje ({vendasHoje.length})</h3>
          {vendasHoje.length === 0 ? (
            <EmptyState icone={ShoppingCart} titulo="Nenhuma venda registrada hoje" subtitulo="As vendas feitas em Vender aparecem aqui automaticamente." />
          ) : (
            <div className="space-y-0 max-h-80 overflow-y-auto pr-1">
              {vendasHoje.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{new Date(v.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {v.clienteNome}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>{pagamentoTextoVenda(v)}</p>
                  </div>
                  <span className="text-sm font-medium shrink-0" style={{ color: 'var(--ink)' }}>{formatBRL(v.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Relatório por data</h3>
          <input type="date" value={dataConsulta} onChange={(e) => setDataConsulta(e.target.value)} className="campo" style={{ width: 'auto' }} max={hoje} />
        </div>
        {(() => {
          const r = resumoDoDia(dataConsulta);
          const vendasData = vendas.filter((v) => soData(v.data) === dataConsulta).sort((a, b) => new Date(a.data) - new Date(b.data));
          const sangriasData = (movimentacoes || []).filter((m) => soData(m.data) === dataConsulta).sort((a, b) => new Date(a.data) - new Date(b.data));
          const caixaData = caixas.find((c) => c.data === dataConsulta);
          const ticketMedio = vendasData.length ? r.receitaTotal / vendasData.length : 0;
          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <KpiCard label="Receita" valor={formatBRL(r.receitaTotal)} icone={TrendingUp} cor="var(--primary)" />
                <KpiCard label="Vendas" valor={vendasData.length} icone={ShoppingCart} cor="var(--accent)" />
                <KpiCard label="Ticket médio" valor={formatBRL(ticketMedio)} icone={FileText} cor="var(--success)" />
                <KpiCard label="Sangrias" valor={formatBRL(r.sangriasTotal)} icone={Wallet} cor="var(--danger)" />
              </div>

              {caixaData && (
                <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
                  Caixa {caixaData.status === 'aberto' ? 'aberto' : 'fechado'} · fundo de troco {formatBRL(caixaData.valorAbertura)}
                  {caixaData.valorContado != null && ` · contado ${formatBRL(caixaData.valorContado)}`}
                </p>
              )}

              {vendasData.length === 0 && sangriasData.length === 0 ? (
                <EmptyState icone={FileText} titulo="Nenhuma operação nesta data" />
              ) : (
                <div className="space-y-0 max-h-96 overflow-y-auto pr-1">
                  {vendasData.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{new Date(v.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {v.clienteNome}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>{pagamentoTextoVenda(v)} · venda</p>
                      </div>
                      <span className="text-sm font-medium shrink-0" style={{ color: 'var(--ink)' }}>{formatBRL(v.total)}</span>
                    </div>
                  ))}
                  {sangriasData.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {m.motivo || 'Sangria'}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Retirada de caixa</p>
                      </div>
                      <span className="text-sm font-medium shrink-0" style={{ color: 'var(--danger)' }}>-{formatBRL(m.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Fechamentos diários</h3>
        {fechados.length === 0 ? <EmptyState icone={Wallet} titulo="Nenhum fechamento ainda" subtitulo="Feche o caixa ao final do dia para começar o histórico." /> : (
          <div className="space-y-2">
            {fechados.slice(0, 15).map((c) => {
              const calc = calcularCaixa(c);
              return (
                <div key={c.id} className="flex items-center justify-between text-sm gap-2 flex-wrap">
                  <span style={{ color: 'var(--ink)' }}>{formatDateBR(c.data)}</span>
                  <span style={{ color: 'var(--ink-soft)' }}>{formatBRL(calc.receitaTotal)}</span>
                  <DiferencaLabel diferenca={calc.diferenca} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Fechamento mensal</h3>
        {mesesOrdenados.length === 0 ? <EmptyState icone={BarChart3} titulo="Sem fechamentos mensais ainda" /> : (
          <div className="space-y-2">
            {mesesOrdenados.map(([mes, d]) => (
              <div key={mes} className="flex items-center justify-between text-sm gap-2 flex-wrap">
                <span className="capitalize" style={{ color: 'var(--ink)' }}>{new Date(mes + '-02T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <span style={{ color: 'var(--ink-soft)' }}>{d.dias} dia(s) fechado(s) · {formatBRL(d.receita)}</span>
                <DiferencaLabel diferenca={d.diferenca} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showAbrir && <AbrirCaixaForm onClose={() => setShowAbrir(false)} onSalvar={(valor) => { onAbrir(valor); setShowAbrir(false); }} />}
      {showSangria && <SangriaForm onClose={() => setShowSangria(false)} onSalvar={(dados) => { onRegistrarSangria(dados); setShowSangria(false); }} />}
      {showFechar && caixaHoje && (
        <FecharCaixaForm caixa={caixaHoje} resumo={calcularCaixa(caixaHoje)} onClose={() => setShowFechar(false)}
          onSalvar={(dados) => { onFechar(caixaHoje.id, dados); setShowFechar(false); }} />
      )}
    </div>
  );
}

/* ============================== TELA: CAMPANHAS E PROMOÇÕES ============================== */

function PromoForm({ promocao, produtos, onSalvar, onClose }) {
  const [form, setForm] = useState(promocao || { percentual: 5, nome: '', produtosIds: [], dataInicio: todayISODate(), dataFim: todayISODate() });
  const [busca, setBusca] = useState('');

  function toggleProduto(id) {
    setForm((f) => ({ ...f, produtosIds: f.produtosIds.includes(id) ? f.produtosIds.filter((x) => x !== id) : [...f.produtosIds, id] }));
  }

  function salvar() {
    if (form.produtosIds.length === 0) return;
    onSalvar({ ...form, id: form.id || uid('promo') });
  }

  const produtosFiltrados = produtos.filter((p) => p.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <Modal onClose={onClose} title={promocao ? 'Editar promoção' : 'Nova promoção'} wide>
      <InputField label="Nome da promoção" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Black Friday bolsas" />
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>Percentual de desconto</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[5, 10, 15].map((p) => (
          <button key={p} onClick={() => setForm({ ...form, percentual: p })}
            className="py-2.5 rounded-lg border text-sm font-semibold"
            style={form.percentual === p ? { borderColor: 'var(--primary)', background: 'var(--primary)10', color: 'var(--primary)' } : { borderColor: 'var(--border)', color: 'var(--ink-soft)' }}>
            {p}%
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <InputField label="Início" type="date" value={form.dataInicio} onChange={(e) => setForm({ ...form, dataInicio: e.target.value })} />
        <InputField label="Fim" type="date" value={form.dataFim} onChange={(e) => setForm({ ...form, dataFim: e.target.value })} />
      </div>
      <p className="text-xs font-medium mb-2 mt-1" style={{ color: 'var(--ink-soft)' }}>Produtos participantes ({form.produtosIds.length} selecionado(s))</p>
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto..." className="campo mb-2" />
      <div className="max-h-52 overflow-y-auto border rounded-lg divide-y" style={{ borderColor: 'var(--border)' }}>
        {produtosFiltrados.map((p) => (
          <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.produtosIds.includes(p.id)} onChange={() => toggleProduto(p.id)} className="w-4 h-4" />
            <span style={{ color: 'var(--ink)' }}>{p.nome}</span>
          </label>
        ))}
      </div>
      <button onClick={salvar} className="btn-primary w-full mt-4">Salvar promoção</button>
    </Modal>
  );
}

function PromocoesView({ produtos, promocoes, onSalvar, onExcluir }) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [excluir, setExcluir] = useState(null);

  function status(p) {
    const hoje = todayISODate();
    if (hoje < p.dataInicio) return { label: 'Agendada', cor: 'var(--accent)' };
    if (hoje > p.dataFim) return { label: 'Encerrada', cor: 'var(--ink-soft)' };
    return { label: 'Ativa', cor: 'var(--success)' };
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <h2 className="text-xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Campanhas e promoções</h2>
        <button onClick={() => setNovo(true)} className="btn-primary flex items-center gap-1.5 justify-center"><Plus size={16} /> Nova promoção</button>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--ink-soft)' }}>
        Cupons de 5%, 10% ou 15% são aplicados automaticamente na venda para os produtos e o período escolhidos. Categorias de campanha em Produtos: {CAMPANHAS_SUBCATEGORIAS.join(', ')}.
      </p>

      {promocoes.length === 0 ? (
        <EmptyState icone={Tag} titulo="Nenhuma promoção cadastrada" subtitulo="Crie cupons de desconto por período para datas como Black Friday e Natal." />
      ) : (
        <div className="space-y-3">
          {promocoes.map((p) => {
            const s = status(p);
            return (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{p.nome || `Cupom ${p.percentual}%`}</span>
                    <span className="badge" style={{ background: s.cor + '1A', color: s.cor }}>{s.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.percentual}% off · {p.produtosIds.length} produto(s) · {formatDateBR(p.dataInicio)} a {formatDateBR(p.dataFim)}</p>
                </div>
                <div className="shrink-0 whitespace-nowrap">
                  <button onClick={() => setEditando(p)} className="text-xs font-medium mr-3" style={{ color: 'var(--primary)' }}>Editar</button>
                  <button onClick={() => setExcluir(p)} className="text-xs font-medium" style={{ color: 'var(--danger)' }}>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(novo || editando) && (
        <PromoForm promocao={editando} produtos={produtos}
          onSalvar={(p) => { onSalvar(p); setNovo(false); setEditando(null); }}
          onClose={() => { setNovo(false); setEditando(null); }} />
      )}
      {excluir && (
        <ConfirmDialog texto={`Excluir a promoção "${excluir.nome || excluir.percentual + '%'}"?`}
          onCancelar={() => setExcluir(null)}
          onConfirmar={() => { onExcluir(excluir.id); setExcluir(null); }} />
      )}
    </div>
  );
}

/* ============================== TELA: DASHBOARD ============================== */

function KpiCard({ label, valor, icone: Icone, cor }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: cor + '1A' }}>
          <Icone size={14} style={{ color: cor }} />
        </div>
        <p className="text-[11px] leading-tight" style={{ color: 'var(--ink-soft)' }}>{label}</p>
      </div>
      <p className="text-base font-semibold leading-tight break-words" style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{valor}</p>
    </div>
  );
}

function MiniBar({ label, valor, max, cor }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="truncate pr-2" style={{ color: 'var(--ink)' }}>{label}</span>
        <span className="shrink-0 font-medium" style={{ color: 'var(--ink-soft)' }}>{valor}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--bg)' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: cor }} />
      </div>
    </div>
  );
}

function SangriaForm({ onSalvar, onClose }) {
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  function salvar() {
    const v = parseFloat(valor);
    if (!v || v <= 0) return;
    onSalvar({ valor: v, motivo });
  }
  return (
    <Modal onClose={onClose} title="Registrar sangria">
      <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>Retirada de dinheiro do caixa (ex.: depósito bancário, troco reforçado em outro caixa).</p>
      <InputField label="Valor retirado (R$)" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
      <InputField label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: depósito bancário" />
      <button onClick={salvar} className="btn-primary w-full mt-2">Registrar sangria</button>
    </Modal>
  );
}

function DashboardView({ produtos, clientes, vendas, movimentacoes, role, onRegistrarSangria }) {
  const [periodo, setPeriodo] = useState('dia');
  const [showSangria, setShowSangria] = useState(false);

  const metrics = useMemo(() => {
    const receitaTotal = vendas.reduce((s, v) => s + v.total, 0);
    const ticketMedioGeral = vendas.length ? receitaTotal / vendas.length : 0;

    const porProduto = {};
    vendas.forEach((v) => v.itens.forEach((it) => {
      if (!porProduto[it.produtoId]) porProduto[it.produtoId] = { nome: it.nome, qtd: 0, receita: 0, transacoes: 0, ultimaData: null };
      porProduto[it.produtoId].qtd += it.quantidade;
      porProduto[it.produtoId].receita += it.quantidade * it.precoUnitario;
      porProduto[it.produtoId].transacoes += 1;
      if (!porProduto[it.produtoId].ultimaData || new Date(v.data) > new Date(porProduto[it.produtoId].ultimaData)) {
        porProduto[it.produtoId].ultimaData = v.data;
      }
    }));
    const maisVendidos = Object.entries(porProduto)
      .map(([id, d]) => ({ id, ...d, ticketMedio: d.transacoes ? d.receita / d.transacoes : 0 }))
      .sort((a, b) => b.qtd - a.qtd).slice(0, 5);
    const maxQtd = maisVendidos[0]?.qtd || 1;

    const porCliente = {};
    vendas.forEach((v) => {
      const chave = v.clienteId || 'avulso';
      if (!porCliente[chave]) porCliente[chave] = { nome: v.clienteNome, compras: 0, total: 0 };
      porCliente[chave].compras += 1;
      porCliente[chave].total += v.total;
    });
    const melhoresClientes = Object.values(porCliente).sort((a, b) => b.compras - a.compras).slice(0, 5);
    const maxCompras = melhoresClientes[0]?.compras || 1;

    const parados = produtos.filter((p) => {
      if (p.quantidade <= 0) return false;
      const ultima = porProduto[p.id]?.ultimaData || p.dataEntrada;
      return daysSince(soData(ultima)) > 30;
    }).map((p) => ({ ...p, dias: daysSince(soData(porProduto[p.id]?.ultimaData || p.dataEntrada)) }))
      .sort((a, b) => b.dias - a.dias);

    const baixoEstoque = produtos.filter((p) => p.estoqueIdeal > 0 && p.quantidade > 0 && p.quantidade / p.estoqueIdeal <= 0.3);
    const semEstoque = produtos.filter((p) => p.quantidade <= 0);

    const porPagamento = {};
    FORMAS_PAGAMENTO.forEach((f) => (porPagamento[f.id] = 0));
    vendas.forEach((v) => acumularPagamento(v, porPagamento));
    const pagamentoData = FORMAS_PAGAMENTO.map((f) => ({ name: f.label, value: porPagamento[f.id] || 0, cor: PAGAMENTO_CORES[f.id] })).filter((d) => d.value > 0);

    const grupos = {};
    vendas.forEach((v) => {
      const data = new Date(v.data);
      let chave;
      if (periodo === 'dia') chave = localDateISO(data);
      else if (periodo === 'semana') chave = isoWeekLabel(data);
      else chave = monthLabel(data);
      grupos[chave] = (grupos[chave] || 0) + v.total;
    });
    const fluxoCaixa = Object.entries(grupos)
      .map(([chave, valor]) => ({ chave, valor }))
      .sort((a, b) => (a.chave > b.chave ? 1 : -1))
      .slice(-14)
      .map((d) => ({ ...d, label: periodo === 'dia' ? formatDateBR(d.chave) : d.chave }));

    const totalSangrias = (movimentacoes || []).reduce((s, m) => s + m.valor, 0);

    return { receitaTotal, ticketMedioGeral, maisVendidos, maxQtd, melhoresClientes, maxCompras, parados, baixoEstoque, semEstoque, pagamentoData, fluxoCaixa, totalSangrias };
  }, [produtos, vendas, periodo, movimentacoes]);

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6">
      <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Painel</h2>

      <div className={`grid grid-cols-2 ${role === 'admin' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 mb-5`}>
        <KpiCard label="Receita total" valor={formatBRL(metrics.receitaTotal)} icone={TrendingUp} cor="var(--primary)" />
        <KpiCard label="Vendas registradas" valor={vendas.length} icone={ShoppingCart} cor="var(--accent)" />
        <KpiCard label="Ticket médio" valor={formatBRL(metrics.ticketMedioGeral)} icone={FileText} cor="var(--success)" />
        <KpiCard label="Alertas de estoque" valor={metrics.baixoEstoque.length + metrics.semEstoque.length} icone={AlertTriangle} cor="var(--warning)" />
        {role === 'admin' && <KpiCard label="Total em sangrias" valor={formatBRL(metrics.totalSangrias)} icone={Wallet} cor="var(--danger)" />}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Fluxo de caixa</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                {[['dia', 'Diário'], ['semana', 'Semanal'], ['mes', 'Mensal']].map(([id, label]) => (
                  <button key={id} onClick={() => setPeriodo(id)} className="px-2.5 py-1 text-xs font-medium"
                    style={{ background: periodo === id ? 'var(--ink)' : '#fff', color: periodo === id ? '#fff' : 'var(--ink-soft)' }}>
                    {label}
                  </button>
                ))}
              </div>
              {role === 'admin' && (
                <button onClick={() => setShowSangria(true)} className="btn-secondary text-xs flex items-center gap-1 px-2.5 py-1"><Wallet size={13} /> Sangria</button>
              )}
            </div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={metrics.fluxoCaixa} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v) => formatBRL(v)} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }} />
                <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Recebimentos por forma de pagamento</h3>
          {metrics.pagamentoData.length === 0 ? <EmptyState icone={CreditCard} titulo="Sem dados ainda" /> : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={metrics.pagamentoData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {metrics.pagamentoData.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatBRL(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Produtos mais vendidos</h3>
          {metrics.maisVendidos.length === 0 ? <EmptyState icone={Star} titulo="Nenhuma venda registrada" /> :
            metrics.maisVendidos.map((p) => (
              <div key={p.id}>
                <MiniBar label={p.nome} valor={`${p.qtd} un.`} max={metrics.maxQtd} cor="var(--primary)" />
                <p className="text-[11px] -mt-2 mb-2" style={{ color: 'var(--ink-soft)' }}>Ticket médio: {formatBRL(p.ticketMedio)}</p>
              </div>
            ))}
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Clientes que mais compram</h3>
          {metrics.melhoresClientes.length === 0 ? <EmptyState icone={Users} titulo="Nenhuma venda registrada" /> :
            metrics.melhoresClientes.map((c, i) => (
              <div key={i}>
                <MiniBar label={c.nome} valor={`${c.compras}x`} max={metrics.maxCompras} cor="var(--accent)" />
                <p className="text-[11px] -mt-2 mb-2" style={{ color: 'var(--ink-soft)' }}>Total gasto: {formatBRL(c.total)}</p>
              </div>
            ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}><AlertTriangle size={15} style={{ color: 'var(--warning)' }} /> Estoque baixo (abaixo de 30%)</h3>
          {metrics.baixoEstoque.length === 0 && metrics.semEstoque.length === 0 ? <EmptyState icone={PackageCheck} titulo="Estoque saudável" /> : (
            <div className="space-y-2">
              {[...metrics.semEstoque, ...metrics.baixoEstoque].map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--ink)' }}>{p.nome}</span>
                  <StockBadge produto={p} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}><Clock size={15} style={{ color: 'var(--ink-soft)' }} /> Parados há mais de 30 dias</h3>
          {metrics.parados.length === 0 ? <EmptyState icone={Clock} titulo="Nenhum produto parado" /> : (
            <div className="space-y-2">
              {metrics.parados.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--ink)' }}>{p.nome}</span>
                  <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{p.dias} dias · {p.quantidade} un.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {role === 'admin' && (movimentacoes || []).length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}><Wallet size={15} /> Sangrias registradas</h3>
          <div className="space-y-2">
            {movimentacoes.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <span style={{ color: 'var(--ink)' }}>{m.motivo || 'Sangria'}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--ink-soft)' }}>{formatDateBR(m.data)}</span>
                </div>
                <span className="font-medium" style={{ color: 'var(--danger)' }}>-{formatBRL(m.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSangria && (
        <SangriaForm onClose={() => setShowSangria(false)} onSalvar={(dados) => { onRegistrarSangria(dados); setShowSangria(false); }} />
      )}
    </div>
  );
}

/* ============================== TELA: CONFIGURAÇÕES ============================== */

function ConfigView({ empresa, onSalvarEmpresa, categorias, onSalvarCategorias, onResetDemo, auth, onSalvarAuth }) {
  const [form, setForm] = useState(empresa);
  const [formAuth, setFormAuth] = useState(auth);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [confirmarReset, setConfirmarReset] = useState(false);

  function uploadLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onSalvarEmpresa({ ...empresa, logoUrl: reader.result });
    reader.readAsDataURL(file);
  }

  function adicionarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome || categorias.some((c) => c.nome === nome)) return;
    onSalvarCategorias([...categorias, { nome }]);
    setNovaCategoria('');
  }

  function removerCategoria(nome) {
    onSalvarCategorias(categorias.filter((c) => c.nome !== nome));
  }

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-2xl">
      <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>Ajustes</h2>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Logotipo</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
            {empresa.logoUrl ? <img src={empresa.logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <ImageIcon size={22} style={{ color: 'var(--ink-soft)' }} />}
          </div>
          <label className="btn-secondary cursor-pointer text-sm">
            Adicionar logotipo depois
            <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          </label>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Dados da empresa</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>Preencha quando tiver os dados definitivos — pode deixar em branco por enquanto.</p>
        <InputField label="Nome da loja" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Empório Bella" />
        <InputField label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
        <InputField label="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        <InputField label="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <button onClick={() => onSalvarEmpresa(form)} className="btn-primary mt-1">Salvar dados</button>
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Envio automático de e-mail</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>
          Opcional. Crie uma conta gratuita em emailjs.com, conecte seu e-mail e cole os 3 dados abaixo para que o comprovante seja enviado automaticamente ao cliente ao finalizar a venda, sem precisar abrir o app de e-mail.
        </p>
        <InputField label="Service ID" value={form.emailjsServiceId} onChange={(e) => setForm({ ...form, emailjsServiceId: e.target.value })} />
        <InputField label="Template ID" value={form.emailjsTemplateId} onChange={(e) => setForm({ ...form, emailjsTemplateId: e.target.value })} />
        <InputField label="Public Key" value={form.emailjsPublicKey} onChange={(e) => setForm({ ...form, emailjsPublicKey: e.target.value })} />
        <button onClick={() => onSalvarEmpresa(form)} className="btn-primary mt-1">Salvar</button>
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Usuários e acesso</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>Login e senha com até 8 caracteres. O CPF do administrador permite redefinir o login do vendedor caso ele seja esquecido — basta digitar o CPF (só números) no campo Login da tela de entrada.</p>
        <p className="text-xs font-semibold mt-2 mb-1" style={{ color: 'var(--ink)' }}>Administrador</p>
        <div className="grid grid-cols-2 gap-x-4">
          <InputField label="Login" value={formAuth.admin.login} onChange={(e) => setFormAuth({ ...formAuth, admin: { ...formAuth.admin, login: e.target.value.slice(0, 11) } })} />
          <InputField label="Senha (até 8)" value={formAuth.admin.senha} maxLength={8} onChange={(e) => setFormAuth({ ...formAuth, admin: { ...formAuth.admin, senha: e.target.value.slice(0, 8) } })} />
        </div>
        <InputField label="CPF do administrador (recuperação)" value={formatCPF(formAuth.admin.cpf)} onChange={(e) => setFormAuth({ ...formAuth, admin: { ...formAuth.admin, cpf: onlyDigits(e.target.value) } })} placeholder="000.000.000-00" />
        <p className="text-xs font-semibold mt-4 mb-1" style={{ color: 'var(--ink)' }}>Vendedor</p>
        <div className="grid grid-cols-2 gap-x-4">
          <InputField label="Login" value={formAuth.vendedor.login} onChange={(e) => setFormAuth({ ...formAuth, vendedor: { ...formAuth.vendedor, login: e.target.value.slice(0, 11) } })} />
          <InputField label="Senha (até 8)" value={formAuth.vendedor.senha} maxLength={8} onChange={(e) => setFormAuth({ ...formAuth, vendedor: { ...formAuth.vendedor, senha: e.target.value.slice(0, 8) } })} />
        </div>
        <button onClick={() => onSalvarAuth(formAuth)} className="btn-primary mt-2">Salvar usuários</button>
      </div>

      <div className="card p-5 mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Categorias de produtos</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {categorias.map((c) => (
            <span key={c.nome} className="badge" style={{ background: categoryColor(c.nome) + '1A', color: categoryColor(c.nome) }}>
              {c.nome}
              <button onClick={() => removerCategoria(c.nome)} className="ml-1"><X size={11} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Nova categoria" className="campo flex-1" />
          <button onClick={adicionarCategoria} className="btn-secondary">Adicionar</button>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink)' }}>Dados de teste</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--ink-soft)' }}>Restaura produtos, clientes e vendas de demonstração para testar o app.</p>
        <button onClick={() => setConfirmarReset(true)} className="btn-secondary flex items-center gap-1.5"><RefreshCw size={14} /> Restaurar dados de demonstração</button>
      </div>

      {confirmarReset && (
        <ConfirmDialog texto="Isso substitui produtos, clientes e vendas atuais pelos dados de demonstração. Continuar?"
          onCancelar={() => setConfirmarReset(false)}
          onConfirmar={() => { onResetDemo(); setConfirmarReset(false); }} />
      )}
    </div>
  );
}

/* ============================== APP PRINCIPAL ============================== */

export default function App() {
  const [view, setView] = useState('pdv');
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);
  const [promocoes, setPromocoes] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [caixas, setCaixas] = useState([]);
  const [auth, setAuth] = useState(DEFAULT_AUTH);
  const [empresa, setEmpresa] = useState({ nome: '', cnpj: '', endereco: '', telefone: '', logoUrl: null, emailjsServiceId: '', emailjsTemplateId: '', emailjsPublicKey: '' });
  const [toast, setToast] = useState(null);

  const avisar = useCallback((mensagem, tipo) => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    (async () => {
      let catalogo = null, clientesData = null, vendasData = null, empresaData = null, authData = null, promocoesData = null, movimentacoesData = null, caixasData = null, sessaoData = null;
      try { catalogo = JSON.parse((await window.storage.get(STORAGE_KEYS.CATALOGO)).value); } catch (e) {}
      try { clientesData = JSON.parse((await window.storage.get(STORAGE_KEYS.CLIENTES)).value); } catch (e) {}
      try { vendasData = JSON.parse((await window.storage.get(STORAGE_KEYS.VENDAS)).value); } catch (e) {}
      try { empresaData = JSON.parse((await window.storage.get(STORAGE_KEYS.EMPRESA)).value); } catch (e) {}
      try { authData = JSON.parse((await window.storage.get(STORAGE_KEYS.AUTH)).value); } catch (e) {}
      try { promocoesData = JSON.parse((await window.storage.get(STORAGE_KEYS.PROMOCOES)).value); } catch (e) {}
      try { movimentacoesData = JSON.parse((await window.storage.get(STORAGE_KEYS.MOVIMENTACOES)).value); } catch (e) {}
      try { caixasData = JSON.parse((await window.storage.get(STORAGE_KEYS.CAIXAS)).value); } catch (e) {}
      try { sessaoData = JSON.parse((await window.storage.get(STORAGE_KEYS.SESSAO)).value); } catch (e) {}

      // Cada informação é tratada de forma independente: uma falha ao ler
      // uma delas nunca deve apagar as outras já salvas.
      const seed = (!catalogo || !clientesData || !vendasData) ? gerarSeed() : null;

      if (catalogo) {
        setProdutos(catalogo.produtos || []);
        setCategorias(normalizarCategorias(catalogo.categorias));
      } else {
        setProdutos(seed.produtos);
        try { await window.storage.set(STORAGE_KEYS.CATALOGO, JSON.stringify({ produtos: seed.produtos, categorias: CATEGORIAS_PADRAO })); } catch (e) {}
      }

      if (clientesData) {
        setClientes(clientesData);
      } else {
        setClientes(seed.clientes);
        try { await window.storage.set(STORAGE_KEYS.CLIENTES, JSON.stringify(seed.clientes)); } catch (e) {}
      }

      if (vendasData) {
        setVendas(vendasData);
      } else {
        setVendas(seed.vendas);
        try { await window.storage.set(STORAGE_KEYS.VENDAS, JSON.stringify(seed.vendas)); } catch (e) {}
      }

      if (authData) {
        setAuth(authData);
      } else {
        try { await window.storage.set(STORAGE_KEYS.AUTH, JSON.stringify(DEFAULT_AUTH)); } catch (e) {}
      }

      if (promocoesData) setPromocoes(promocoesData);
      if (movimentacoesData) setMovimentacoes(movimentacoesData);
      if (caixasData) setCaixas(caixasData);
      if (empresaData) setEmpresa(empresaData);
      if (sessaoData && sessaoData.role) setSessao(sessaoData);

      setCarregando(false);
    })();
  }, []);

  const salvarProdutos = useCallback(async (next, cats) => {
    setProdutos(next);
    try { await window.storage.set(STORAGE_KEYS.CATALOGO, JSON.stringify({ produtos: next, categorias: cats || categorias })); } catch (e) {}
  }, [categorias]);

  const salvarClientes = useCallback(async (next) => {
    setClientes(next);
    try { await window.storage.set(STORAGE_KEYS.CLIENTES, JSON.stringify(next)); } catch (e) {}
  }, []);

  const salvarVendas = useCallback(async (next) => {
    setVendas(next);
    try { await window.storage.set(STORAGE_KEYS.VENDAS, JSON.stringify(next)); } catch (e) {}
  }, []);

  const salvarEmpresa = useCallback(async (next) => {
    setEmpresa(next);
    try { await window.storage.set(STORAGE_KEYS.EMPRESA, JSON.stringify(next)); } catch (e) {}
    avisar('Dados da empresa salvos', 'ok');
  }, [avisar]);

  const salvarAuth = useCallback(async (next) => {
    setAuth(next);
    try { await window.storage.set(STORAGE_KEYS.AUTH, JSON.stringify(next)); } catch (e) {}
  }, []);

  const salvarPromocoes = useCallback(async (next) => {
    setPromocoes(next);
    try { await window.storage.set(STORAGE_KEYS.PROMOCOES, JSON.stringify(next)); } catch (e) {}
  }, []);

  const salvarMovimentacoes = useCallback(async (next) => {
    setMovimentacoes(next);
    try { await window.storage.set(STORAGE_KEYS.MOVIMENTACOES, JSON.stringify(next)); } catch (e) {}
  }, []);

  const salvarCaixas = useCallback(async (next) => {
    setCaixas(next);
    try { await window.storage.set(STORAGE_KEYS.CAIXAS, JSON.stringify(next)); } catch (e) {}
  }, []);

  function handleAbrirCaixa(valorAbertura) {
    const hoje = todayISODate();
    const existente = caixas.find((c) => c.data === hoje);
    if (existente && existente.status === 'aberto') { avisar('O caixa de hoje já está aberto', 'erro'); return; }
    if (existente && existente.status === 'fechado') {
      const next = caixas.map((c) => (c.id === existente.id ? { ...c, status: 'aberto', fechamentoEm: null, valorContado: null, observacaoFechamento: '' } : c));
      salvarCaixas(next);
      avisar('Caixa reaberto', 'ok');
      return;
    }
    const novo = { id: uid('caixa'), data: hoje, aberturaEm: new Date().toISOString(), fechamentoEm: null, valorAbertura, valorContado: null, observacaoFechamento: '', status: 'aberto' };
    salvarCaixas([novo, ...caixas]);
    avisar('Caixa aberto', 'ok');
  }

  function handleFecharCaixa(id, { valorContado, observacao }) {
    const next = caixas.map((c) => (c.id === id ? { ...c, fechamentoEm: new Date().toISOString(), valorContado, observacaoFechamento: observacao, status: 'fechado' } : c));
    salvarCaixas(next);
    avisar('Caixa fechado', 'ok');
  }

  function handleEntrar(sessaoNova) {
    setSessao(sessaoNova);
    setView('pdv');
    try { window.storage.set(STORAGE_KEYS.SESSAO, JSON.stringify(sessaoNova)); } catch (e) {}
  }

  function handleSair() {
    setSessao(null);
    try { window.storage.delete(STORAGE_KEYS.SESSAO); } catch (e) {}
  }

  function handleRecuperarVendedor({ login, senha }) {
    const next = { ...auth, vendedor: { login, senha } };
    salvarAuth(next);
    avisar('Login do vendedor atualizado', 'ok');
  }

  function handleSalvarAuth(next) {
    salvarAuth(next);
    avisar('Usuários atualizados', 'ok');
  }

  function handleSalvarProduto(produto) {
    const existe = produtos.some((p) => p.id === produto.id);
    const next = existe ? produtos.map((p) => (p.id === produto.id ? produto : p)) : [produto, ...produtos];
    salvarProdutos(next);
    avisar(existe ? 'Produto atualizado' : 'Produto cadastrado', 'ok');
  }

  function handleExcluirProduto(id) {
    salvarProdutos(produtos.filter((p) => p.id !== id));
    avisar('Produto removido', 'ok');
  }

  function handleSalvarCliente(cliente) {
    const existe = clientes.some((c) => c.id === cliente.id);
    const next = existe ? clientes.map((c) => (c.id === cliente.id ? cliente : c)) : [cliente, ...clientes];
    salvarClientes(next);
    avisar(existe ? 'Cliente atualizado' : 'Cliente cadastrado', 'ok');
  }

  function handleExcluirCliente(id) {
    salvarClientes(clientes.filter((c) => c.id !== id));
    avisar('Cliente removido', 'ok');
  }

  function handleSalvarCategorias(next) {
    setCategorias(next);
    salvarProdutos(produtos, next);
  }

  function handleSalvarPromocao(promo) {
    const existe = promocoes.some((p) => p.id === promo.id);
    const next = existe ? promocoes.map((p) => (p.id === promo.id ? promo : p)) : [promo, ...promocoes];
    salvarPromocoes(next);
    avisar(existe ? 'Promoção atualizada' : 'Promoção criada', 'ok');
  }

  function handleExcluirPromocao(id) {
    salvarPromocoes(promocoes.filter((p) => p.id !== id));
    avisar('Promoção removida', 'ok');
  }

  function handleRegistrarSangria({ valor, motivo }) {
    const nova = { id: uid('sang'), valor, motivo, data: new Date().toISOString() };
    salvarMovimentacoes([nova, ...movimentacoes]);
    avisar('Sangria registrada', 'ok');
  }

  function handleFinalizarVenda({ carrinho, clienteId, clienteNome, formaPagamento, total, descontoAdicional, parcelasCredito, notaFiscal }) {
    const venda = { id: uid('v'), data: new Date().toISOString(), clienteId, clienteNome, itens: carrinho, total, descontoAdicional, parcelasCredito, formaPagamento, notaFiscal };
    salvarVendas([venda, ...vendas]);
    const produtosAtualizados = produtos.map((p) => {
      const item = carrinho.find((i) => i.produtoId === p.id);
      if (!item) return p;
      return { ...p, quantidade: Math.max(0, p.quantidade - item.quantidade) };
    });
    salvarProdutos(produtosAtualizados);
    avisar('Venda registrada com sucesso', 'ok');
  }

  function handleResetDemo() {
    const seed = gerarSeed();
    salvarProdutos(seed.produtos, categorias);
    salvarClientes(seed.clientes);
    salvarVendas(seed.vendas);
    avisar('Dados de demonstração restaurados', 'ok');
  }

  return (
    <div className="app-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
        .app-root {
          --bg: #F7F6F9;
          --surface: #FFFFFF;
          --ink: #241B2F;
          --ink-soft: #6B6076;
          --primary: #7A2E4D;
          --accent: #C9A227;
          --success: #3F7D58;
          --warning: #C6642A;
          --danger: #A23B3B;
          --border: #E6E1EA;
          --font-display: 'Fraunces', serif;
          --font-body: 'Inter', sans-serif;
          font-family: var(--font-body);
          background: var(--bg);
          min-height: 100vh;
          color: var(--ink);
        }
        .campo {
          width: 100%;
          padding: 0.55rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: #fff;
          font-size: 16px;
          font-family: var(--font-body);
          color: var(--ink);
          outline: none;
        }
        textarea.campo { line-height: 1.4; }
        .campo:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(122,46,77,0.1); }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 0.85rem; }
        .badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
        .btn-primary {
          background: var(--primary); color: #fff; font-weight: 600; font-size: 0.875rem;
          padding: 0.65rem 1.1rem; border-radius: 0.6rem; transition: opacity 0.15s;
        }
        .btn-primary:hover { opacity: 0.9; }
        .btn-secondary {
          background: #fff; color: var(--ink); font-weight: 600; font-size: 0.875rem;
          padding: 0.6rem 1rem; border-radius: 0.6rem; border: 1px solid var(--border);
        }
        .btn-secondary:hover { background: var(--bg); }
        .btn-danger {
          background: var(--danger); color: #fff; font-weight: 600; font-size: 0.875rem;
          padding: 0.6rem 1rem; border-radius: 0.6rem;
        }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .toast-anim { animation: rise 0.2s ease-out; }
        @keyframes rise { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @media print {
          body * { visibility: hidden; }
          #recibo-print, #recibo-print * { visibility: visible; }
          #recibo-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {carregando ? (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Carregando...</p>
        </div>
      ) : !sessao ? (
        <LoginView auth={auth} onEntrar={handleEntrar} onRecuperarVendedor={handleRecuperarVendedor} />
      ) : (
        <div className="flex">
          <Sidebar view={view} setView={setView} empresa={empresa} sessao={sessao} onSair={handleSair} />
          <div className="flex-1 min-w-0">
            {view === 'pdv' && <PDVView produtos={produtos} clientes={clientes} categorias={categorias} empresa={empresa} promocoes={promocoes} role={sessao.role} caixaAberto={caixas.some((c) => c.data === todayISODate() && c.status === 'aberto')} onAbrirCaixa={handleAbrirCaixa} onFinalizarVenda={handleFinalizarVenda} />}
            {view === 'produtos' && <ProdutosView produtos={produtos} categorias={categorias} role={sessao.role} onSalvar={handleSalvarProduto} onExcluir={handleExcluirProduto} />}
            {view === 'clientes' && <ClientesView clientes={clientes} vendas={vendas} onSalvar={handleSalvarCliente} onExcluir={handleExcluirCliente} />}
            {view === 'caixa' && <CaixaView caixas={caixas} vendas={vendas} movimentacoes={movimentacoes} role={sessao.role} onAbrir={handleAbrirCaixa} onFechar={handleFecharCaixa} onRegistrarSangria={handleRegistrarSangria} />}
            {view === 'dashboard' && <DashboardView produtos={produtos} clientes={clientes} vendas={vendas} movimentacoes={movimentacoes} role={sessao.role} onRegistrarSangria={handleRegistrarSangria} />}
            {view === 'promocoes' && sessao.role === 'admin' && <PromocoesView produtos={produtos} promocoes={promocoes} onSalvar={handleSalvarPromocao} onExcluir={handleExcluirPromocao} />}
            {view === 'config' && sessao.role === 'admin' && <ConfigView empresa={empresa} onSalvarEmpresa={salvarEmpresa} categorias={categorias} onSalvarCategorias={handleSalvarCategorias} onResetDemo={handleResetDemo} auth={auth} onSalvarAuth={handleSalvarAuth} />}
          </div>
        </div>
      )}
      {sessao && <BottomNav view={view} setView={setView} sessao={sessao} />}
      <Toast toast={toast} />
    </div>
  );
}
