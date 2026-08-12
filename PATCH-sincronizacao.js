// ========================================
// PATCH para KnifeCards.html
// Sincronização Inteligente com Timestamps
// ========================================
//
// Substitua as funções abaixo no KnifeCards.html (procure por "SEÇÃO 10")
// Linhas aproximadas: 1377-1478

// ============ NOVA FUNÇÃO: smartMerge() ============
// Coloque ANTES de applyRemote()
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

  // Merge sessions (histórico de revisões)
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

// ============ MODIFICADA: applyRemote() ============
// REMOVA a versão antiga (que faz state = data)
// SUBSTITUA por:
function applyRemote(data){
  // Faz merge ao invés de sobrescrever
  smartMerge(data);
  save(); applyTheme();
  renderToday(); renderDecks(); renderStats();
}

// ============ MODIFICADA: syncNow() ============
// REMOVA a versão antiga completamente
// SUBSTITUA por:
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
      if (!silent) toast('Dados remotos mesclados. ');
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

// ============================================================
// VERIFICAÇÃO: Garantir que todos os items têm modifiedAt
// ============================================================
// Procure pelos locais onde isso é criado:
// - state.cards.push(...)
// - state.decks.push(...)
// - state.areas.push(...)
//
// Verifique que TODOS têm: modifiedAt: Date.now()
//
// Exemplo CORRETO:
// state.cards.push({
//   id: uid(),
//   deckId: dk,
//   ...vals,
//   createdAt: Date.now(),
//   modifiedAt: Date.now(),    // ← IMPORTANTE!
//   fsrs: null
// });
