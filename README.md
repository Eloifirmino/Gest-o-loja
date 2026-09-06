# Gestão da Loja

App de vendas, estoque, clientes, caixa e campanhas — pronto para rodar fora do Claude,
em qualquer navegador, sem as limitações do ambiente de teste (câmera, galeria de fotos
e busca de CEP funcionam normalmente aqui).

## Login inicial

- Administrador: login `admin`, senha `admin123`
- Vendedor: login `venda`, senha `venda123`

Troque essas senhas em **Ajustes → Usuários** assim que possível, e cadastre ali o CPF do
administrador (usado para redefinir o login do vendedor caso ele seja esquecido).

## Onde ficam os dados

Este projeto salva tudo no armazenamento local do navegador (localStorage) do computador
ou celular usado. Ou seja:

- Os dados **não são compartilhados automaticamente** entre dispositivos diferentes (o celular
  do vendedor e o computador do caixa, por exemplo, cada um teria sua própria base).
- Limpar os dados de navegação do navegador apaga os dados do app.
- Se no futuro for necessário que todos os dispositivos vejam os mesmos dados em tempo real,
  o próximo passo é trocar esse armazenamento local por um banco de dados na nuvem (ex.:
  Supabase ou Firebase, ambos com planos gratuitos) — posso te ajudar com isso quando for a hora.

## Envio automático de e-mail (opcional)

Em Ajustes → "Envio automático de e-mail", você pode conectar uma conta gratuita do
[EmailJS](https://emailjs.com) (Service ID, Template ID, Public Key) para que o comprovante
seja enviado sozinho ao cliente ao finalizar a venda, sem abrir nenhum app. Sem essa
configuração, o app oferece o envio manual (abre o WhatsApp ou e-mail com o texto pronto).

No template do EmailJS, configure o campo **"To Email"** como `{{to_email}}` e inclua
`{{message}}` no corpo da mensagem.

## Comprovante em imagem ou PDF

Ao finalizar uma venda, o botão "Compartilhar comprovante (imagem)" gera uma imagem do
comprovante e abre o menu nativo de compartilhamento do celular (funciona melhor no Chrome
para Android). O botão "Salvar como PDF" usa a função de impressão do navegador — escolha
"Salvar como PDF" em vez de uma impressora.

## Rodar no seu computador

Pré-requisito: ter o [Node.js](https://nodejs.org) instalado (versão 18 ou mais recente).

```bash
npm install
npm run dev
```

Isso abre o app em `http://localhost:5173`. A câmera do celular só funciona em endereços
`https://` ou `localhost` — isso é uma exigência de segurança dos navegadores, não do app.

## Publicar de graça na internet

A forma mais simples é pela [Vercel](https://vercel.com) ou [Netlify](https://netlify.com),
ambas com plano gratuito:

1. Crie uma conta gratuita na Vercel ou Netlify
2. Suba esta pasta para um repositório no GitHub (ou arraste a pasta direto no painel da Netlify, opção "Deploy manually")
3. Ao importar o projeto, confirme:
   - Comando de build: `npm run build`
   - Pasta de saída: `dist`
4. Publique — você recebe um link `https://seu-projeto.vercel.app` (ou `.netlify.app`) para acessar de qualquer celular ou computador

Depois de publicado, teste a câmera do scanner e o upload de foto pela galeria — devem
funcionar normalmente, já que essas funções só ficavam bloqueadas dentro do ambiente de
teste do Claude.

## Estrutura do projeto

- `src/App.jsx` — todo o app (vendas, produtos, clientes, caixa, campanhas, login)
- `src/main.jsx` — ponto de entrada; troca o armazenamento do Claude pelo localStorage do navegador
- `src/index.css` — estilos base do Tailwind
