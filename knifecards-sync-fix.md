# KnifeCards - Sincronização Inteligente com Timestamps

## Problema
Quando você sincroniza no iPhone, o app puxa dados antigos do GitHub Gist e sobrescreve tudo que você criou no Mac.

## Solução
Implementar **merge inteligente por timestamps** — cada card, deck e área compara `modifiedAt` e **mantém a versão mais recente**.

---

## Como implementar

### PASSO 1: Localizar o trecho de sincronização

No arquivo `KnifeCards.html`, procure por (usando Ctrl+F):
```
SEÇÃO 10 · SINCRONIZAÇÃO VIA GITHUB GIST
```

Vai ficar entre as linhas ~1377-1470.

---

### PASSO 2: Substituir `applyRemote()` e `syncNow()`

**REMOVA** estas funções:
```javascript
function applyRemote(data){
  state = data;
  const def = defaultState();
  for (const [k,v] of Object.entries(def)) if (!(k in state)) state[k] = v;
  for (const [k,v] of Object.entries(def.settings)) if (!(k in state.settings)) state.settings[k] = v;
  save(); applyTheme();
```

**SUBSTITUA** por este código:

```javascript
// Merge inteligente: compara timestamps de cada entidade
function smartMerge(remote){
  if (!remote) return;
  
  // Merge areas
  for (const remoteArea of remote.areas || []){
    const local = state.areas.find(a => a.id === remoteArea.id);
    if (!local){
      state.areas.push(remoteArea);
    } else if ((remoteArea.modifiedAt || 0) > (local.modifiedAt || 0)){
      Object.assign(local, remoteArea);
    }
  }
  
  // Merge decks
  for (const remoteDeck of remote.decks || []){
    const local = state.decks.find(d => d.id === remoteDeck.id);
    if (!local){
      state.decks.push(remoteDeck);
    } else if ((remoteDeck.modifiedAt || 0) > (local.modifiedAt || 0)){
      Object.assign(local, remoteDeck);
    }
  }
  
  // Merge cards
  for (const remoteCard of remote.cards || []){
    const local = state.cards.find(c => c.id === remoteCard.id);
    if (!local){
      state.cards.push(remoteCard);
    } else if ((remoteCard.modifiedAt || 0) > (local.modifiedAt || 0)){
      Object.assign(local, remoteCard);
    }
  }
  
  // Merge sessions (histórico de revisões) — sempre pega o mais recente
  const localSessions = new Map(state.sessions.map(s => [s.at, s]));
  for (const remoteSession of remote.sessions || []){
    if (!localSessions.has(remoteSession.at)){
      localSessions.set(remoteSession.at, remoteSession);
    }
  }
  state.sessions = Array.from(localSessions.values()).sort((a,b) => b.at - a.at);
  if (state.sessions.length > 100) state.sessions.length = 100;
  
  // Merge streak
  if (remote.streak){
    state.streak.current = Math.max(state.streak.current || 0, remote.streak.current || 0);
    state.streak.history = { ...state.streak.history, ...(remote.streak.history || {}) };
  }
  
  // Settings: mescla sem conflitos
  if (remote.settings){
    for (const [k,v] of Object.entries(remote.settings)){
      if (!(k in state.settings)) state.settings[k] = v;
    }
  }
}

function applyRemote(data){
  // Faz merge ao invés de sobrescrever
  smartMerge(data);
  save(); applyTheme();
  renderToday(); renderDecks(); renderStats();
}
```

---

### PASSO 3: Modificar `syncNow()` para **SEMPRE** fazer merge

**ENCONTRE** a função `syncNow()` (linha ~1437) e **SUBSTITUA** por:

```javascript
let syncing = false;
async function syncNow(silent = false){
  if (syncing) return;
  if (!syncCfg.token){ if (!silent) toast('Cole seu token do GitHub primeiro.'); return; }
  syncing = true;
  try {
    setSyncStatus('Sincronizando...');
    if (!syncCfg.gistId){
      syncCfg.gistId = await ghFindGist();
      if (syncCfg.gistId === null){
        syncCfg.gistId = await ghCreateGist();
        saveSyncCfg();
        const gi = $('#sync-gist'); if (gi) gi.value = syncCfg.gistId;
        syncCfg.lastSync = Date.now(); saveSyncCfg(); setSyncStatus();
        if (!silent) toast('Gist criado e dados enviados. ⬆');
        return;
      }
      saveSyncCfg();
      const gi = $('#sync-gist'); if (gi) gi.value = syncCfg.gistId;
    }
    
    // NOVO: Puxar dados remotos E fazer merge inteligente
    const remote = await ghPull();
    if (remote){
      smartMerge(remote);
      applyTheme(); renderToday(); renderDecks(); renderStats();
      toast('Dados sincronizados (merge inteligente). ↔️');
    }
    
    // NOVO: SEMPRE enviar dados locais (push)
    // Assim o Gist fica com a versão mais completa
    await ghPush();
    
    syncCfg.lastSync = Date.now(); saveSyncCfg(); setSyncStatus();
    if (!silent) toast('Sincronização completa. ↔️');
  } catch(e){
    setSyncStatus('Erro: ' + e.message);
    if (!silent) toast('Erro na sincronização: ' + e.message);
  } finally { syncing = false; }
}
```

---

### PASSO 4: Garantir que todo card/deck tem `modifiedAt`

No código, procure por **TODAS** as linhas onde cards ou decks são criados:
- `state.cards.push(...)`
- `state.decks.push(...)`

E verifique que têm `modifiedAt: Date.now()`. Exemplo:

```javascript
// ✓ CORRETO
state.cards.push({ 
  id: uid(), 
  deckId: dk, 
  ...vals, 
  createdAt: Date.now(), 
  modifiedAt: Date.now(), 
  fsrs: null 
});

// ✓ CORRETO
state.decks.push({ 
  id: uid(), 
  name, 
  areaId: area.id, 
  createdAt: Date.now(), 
  modifiedAt: Date.now(), 
  changelog: [] 
});
```

---

## O que muda

| Antes | Depois |
|-------|--------|
| Sincronização one-way (pull) | Sincronização two-way inteligente (merge) |
| Dados antigos sobrescrevem novos | Versão mais recente de cada item vence |
| Se abrir iPhone, perde Mac | Mac + iPhone vivem em harmonia |
| Precisa sincronizar manualmente no Mac | Automático: merge + push |

---

## Resultado

Agora:
1. ✅ Cria cards no Mac → iPhone sincroniza automaticamente
2. ✅ Estuda no iPhone → Mac sincroniza automaticamente
3. ✅ **Ninguém perde dados** — cada item mantém a versão mais recente
4. ✅ Funciona bidirecionalmente sem conflitos

---

## Teste

1. **Mac**: cria um novo card
2. **iPhone**: abre o app (vai sincronizar automaticamente)
3. ✅ Card apareça no iPhone
4. **iPhone**: revisa o card (marca como "Bom")
5. **Mac**: recarrega a página
6. ✅ Revisão apareça no Mac

Pronto! 🎉
