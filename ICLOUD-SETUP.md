# Setup iCloud Drive para KnifeCards

## Instalação

```bash
cd ~/Claude/Projects/Knifecards

# 1. Instalar dependências
npm install

# 2. Rodar o app
npm start
```

## O que foi feito

✅ **main.js** - Electron principal que acessa iCloud Drive  
✅ **preload.js** - Ponte entre HTML e Node.js  
✅ **package.json** - Scripts de build  
✅ **KnifeCards.html** - Modificado para usar iCloud em vez de localStorage  

## Como funciona

1. App Electron lê/escreve em: `~/Library/Mobile Documents/com~apple~CloudDocs/KnifeCards/data.json`
2. iCloud sincroniza automaticamente entre seus dispositivos
3. Dados persistem mesmo se perder o Mac (estão no iCloud)

## Testes

1. Abrir o app: `npm start`
2. Criar alguns cards
3. Fechar o app
4. Abrir novamente → dados devem estar lá
5. Verificar arquivo: `~/Library/Mobile Documents/com~apple~CloudDocs/KnifeCards/data.json`

## Migração de dados antigos

Se quer recuperar dados do localStorage anterior:

```javascript
// No console do DevTools:
const old = JSON.parse(localStorage.getItem('knifecards'));
window.icloud.save(old);
```

## Próximos passos

- Remover `openDevTools()` em `main.js` (linha 29) para produção
- Criar .dmg para distribuição (opcional)
- Testar sincronização entre dispositivos (Mac + iPhone)
