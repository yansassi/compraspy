document.addEventListener('DOMContentLoaded', () => {
    const mockupPanel = document.getElementById('mockup-panel');
    const panelToggle = document.getElementById('panel-toggle');
    const toggleGuidesCheckbox = document.getElementById('toggle-guides');
    const siteWrapper = document.getElementById('site-wrapper');
    const resetAllBtn = document.getElementById('reset-all');
    const saveToPbBtn = document.getElementById('btn-save-to-pb');

    const bannerIds = ['lateral-esquerda','lateral-direita','topo-esquerda','topo-direita','topo-ofertas','meio-ofertas'];
    const pocketbaseMapping = {
        'lateral-esquerda': 'banner_lateral_esq',
        'lateral-direita': 'banner_lateral_dir',
        'topo-esquerda': 'banner_topo_esq',
        'topo-direita': 'banner_topo_dir',
        'topo-ofertas': 'banner_topo_ofertas',
        'meio-ofertas': 'banner_meio_ofertas'
    };

    // Arquivos novos carregados pelo usuario no painel (Feature 1)
    const pendingFiles = {};
    // ID do registro PocketBase ativo para PATCH/POST
    let activePbRecordId = null;

    // ==========================================
    // 1. BUSCA VIA URL
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    let activeSearchTerm = urlParams.get('busca') || 'xiaomi';
    activeSearchTerm = activeSearchTerm.trim().toLowerCase();

    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const searchResultsTitle = document.querySelector('.search-results-header h2');

    if (searchInput) searchInput.value = activeSearchTerm;
    if (searchResultsTitle) {
        searchResultsTitle.innerHTML = activeSearchTerm.toUpperCase() + ' <span class="results-count">(2314 Resultados)</span>';
    }

    function handleSearchSubmit() {
        if (searchInput) {
            const term = searchInput.value.trim().toLowerCase();
            if (term) window.location.href = 'index.html?busca=' + encodeURIComponent(term);
        }
    }
    if (searchButton) searchButton.addEventListener('click', handleSearchSubmit);
    if (searchInput) searchInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') handleSearchSubmit(); });

    // ==========================================
    // 2. PAINEL DE CONTROLE
    // ==========================================
    if (panelToggle && mockupPanel) {
        panelToggle.addEventListener('click', function() { mockupPanel.classList.toggle('collapsed'); });
    }
    document.addEventListener('click', function(e) {
        if (mockupPanel && panelToggle && !mockupPanel.contains(e.target) && !panelToggle.contains(e.target) && !mockupPanel.classList.contains('collapsed')) {
            mockupPanel.classList.add('collapsed');
        }
    });

    // FIX 2: X vermelho some/aparece junto com as guias amarelas
    if (toggleGuidesCheckbox && siteWrapper) {
        toggleGuidesCheckbox.addEventListener('change', function() {
            if (toggleGuidesCheckbox.checked) {
                siteWrapper.classList.remove('hide-mockup-guides');
                document.querySelectorAll('.quick-remove-btn').forEach(function(btn) { btn.style.display = 'flex'; });
            } else {
                siteWrapper.classList.add('hide-mockup-guides');
                document.querySelectorAll('.quick-remove-btn').forEach(function(btn) { btn.style.display = 'none'; });
            }
            localStorage.setItem('mockup-show-guides', toggleGuidesCheckbox.checked);
        });
    }
    var savedGuidesPref = localStorage.getItem('mockup-show-guides');
    if (savedGuidesPref !== null && toggleGuidesCheckbox && siteWrapper) {
        var showGuides = savedGuidesPref === 'true';
        toggleGuidesCheckbox.checked = showGuides;
        if (showGuides) siteWrapper.classList.remove('hide-mockup-guides');
        else siteWrapper.classList.add('hide-mockup-guides');
    }

    // ==========================================
    // 3. BANNERS
    // ==========================================
    function applyBannerImage(bannerId, url, saveToLocal) {
        if (saveToLocal === undefined) saveToLocal = false;
        var bannerArea = document.querySelector('.mockup-banner-area[data-banner-id="' + bannerId + '"]');
        if (bannerArea) {
            bannerArea.style.backgroundImage = "url('" + url + "')";
            bannerArea.classList.add('has-image');
            var removeBtn = bannerArea.querySelector('.quick-remove-btn');
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.className = 'quick-remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remover esta imagem';
                (function(bid) {
                    removeBtn.addEventListener('click', function(e) {
                        e.stopPropagation(); e.preventDefault();
                        clearSingleBanner(bid);
                        delete pendingFiles[bid];
                        checkPendingFiles();
                    });
                })(bannerId);
                bannerArea.appendChild(removeBtn);
                // FIX 2: se guias estao desativadas, ja nasce oculto
                if (toggleGuidesCheckbox && !toggleGuidesCheckbox.checked) {
                    removeBtn.style.display = 'none';
                }
            }
        }
        if (saveToLocal) {
            try { localStorage.setItem('mockup-banner-' + bannerId, url); } catch(err) {}
        }
    }

    function clearSingleBannerVisual(bannerId) {
        var bannerArea = document.querySelector('.mockup-banner-area[data-banner-id="' + bannerId + '"]');
        if (bannerArea) {
            bannerArea.style.backgroundImage = '';
            bannerArea.classList.remove('has-image');
            var rb = bannerArea.querySelector('.quick-remove-btn');
            if (rb) rb.remove();
        }
    }

    function clearSingleBanner(bannerId) {
        clearSingleBannerVisual(bannerId);
        localStorage.removeItem('mockup-banner-' + bannerId);
        var si = document.querySelector('.mockup-banner-area[data-banner-id="' + bannerId + '"] .banner-file-input');
        var pi = document.querySelector('input[data-banner="' + bannerId + '"]');
        if (si) si.value = '';
        if (pi) pi.value = '';
    }

    function handleFileSelect(file, bannerId) {
        if (!file || !file.type.match('image.*')) { alert('Por favor, selecione apenas arquivos de imagem.'); return; }
        var reader = new FileReader();
        reader.onload = function(e) { applyBannerImage(bannerId, e.target.result, true); };
        reader.readAsDataURL(file);
    }

    // Mostra/oculta o botao Salvar conforme haja arquivos pendentes
    function checkPendingFiles() {
        if (!saveToPbBtn) return;
        saveToPbBtn.style.display = Object.keys(pendingFiles).length > 0 ? 'block' : 'none';
    }

    bannerIds.forEach(function(bannerId) {
        var bannerArea = document.querySelector('.mockup-banner-area[data-banner-id="' + bannerId + '"]');
        var siteInput = bannerArea ? bannerArea.querySelector('.banner-file-input') : null;
        var panelInput = document.querySelector('input[data-banner="' + bannerId + '"]');

        if (siteInput) {
            siteInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], bannerId);
                    pendingFiles[bannerId] = e.target.files[0];
                    checkPendingFiles();
                }
            });
        }
        if (panelInput) {
            panelInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], bannerId);
                    if (siteInput) siteInput.files = e.target.files;
                    pendingFiles[bannerId] = e.target.files[0];
                    checkPendingFiles();
                }
            });
        }
        if (bannerArea && siteInput) {
            ['dragenter','dragover'].forEach(function(ev) {
                siteInput.addEventListener(ev, function() { bannerArea.classList.add('dragover'); }, false);
            });
            ['dragleave','drop'].forEach(function(ev) {
                siteInput.addEventListener(ev, function() { bannerArea.classList.remove('dragover'); }, false);
            });
        }
    });

    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', function() {
            if (confirm('Tem certeza de que deseja remover todos os seus banners locais e restaurar os padroes?')) {
                bannerIds.forEach(function(bannerId) { clearSingleBanner(bannerId); delete pendingFiles[bannerId]; });
                checkPendingFiles();
                if (mockupPanel) mockupPanel.classList.remove('collapsed');
            }
        });
    }

    // ==========================================
    // 4. POCKETBASE - CARREGAR BANNERS
    // ==========================================
    async function loadMockupsFromPocketBase(searchTerm) {
        if (typeof POCKETBASE_URL === 'undefined') { console.warn('POCKETBASE_URL nao definida.'); return false; }
        try {
            var filterStr = "(search_term='" + encodeURIComponent(searchTerm) + "')";
            var response = await fetch(POCKETBASE_URL + '/api/collections/mockups/records?filter=' + filterStr);
            var data = await response.json();
            if (response.ok && data.items && data.items.length > 0) {
                var record = data.items[0];
                activePbRecordId = record.id;
                bannerIds.forEach(function(bid) { clearSingleBannerVisual(bid); });
                bannerIds.forEach(function(bid) {
                    var pbKey = pocketbaseMapping[bid];
                    if (record[pbKey]) {
                        var fileUrl = POCKETBASE_URL + '/api/files/' + record.collectionId + '/' + record.id + '/' + record[pbKey];
                        applyBannerImage(bid, fileUrl, false);
                    }
                });
                console.log('Mockups carregados para: ' + searchTerm);
                return true;
            }
        } catch (err) { console.error('Falha ao carregar PocketBase:', err); }
        return false;
    }

    async function initBanners() {
        var loaded = await loadMockupsFromPocketBase(activeSearchTerm);
        if (!loaded) {
            bannerIds.forEach(function(bid) {
                var saved = localStorage.getItem('mockup-banner-' + bid);
                if (saved) applyBannerImage(bid, saved, false);
                else clearSingleBannerVisual(bid);
            });
        }
    }
    initBanners();

    // ==========================================
    // 5. FEATURE 1: SALVAR ALTERACOES NO POCKETBASE
    // ==========================================
    if (saveToPbBtn) {
        saveToPbBtn.addEventListener('click', async function() {
            var token = localStorage.getItem('pocketbase_auth_token');
            if (!token) {
                alert('Voce precisa estar logado como administrador para salvar.\nClique em Painel Admin PocketBase para entrar.');
                return;
            }
            if (Object.keys(pendingFiles).length === 0) { alert('Nenhuma imagem nova para salvar.'); return; }
            saveToPbBtn.disabled = true;
            saveToPbBtn.textContent = 'Salvando...';
            var formData = new FormData();
            formData.append('search_term', activeSearchTerm);
            Object.keys(pendingFiles).forEach(function(bid) {
                formData.append(pocketbaseMapping[bid], pendingFiles[bid]);
            });
            var isEdit = !!activePbRecordId;
            var url = isEdit
                ? POCKETBASE_URL + '/api/collections/mockups/records/' + activePbRecordId
                : POCKETBASE_URL + '/api/collections/mockups/records';
            try {
                var response = await fetch(url, {
                    method: isEdit ? 'PATCH' : 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                var data = await response.json();
                if (response.ok) {
                    if (!isEdit) activePbRecordId = data.id;
                    Object.keys(pendingFiles).forEach(function(k) { delete pendingFiles[k]; });
                    checkPendingFiles();
                    saveToPbBtn.textContent = 'Salvo com sucesso!';
                    setTimeout(function() {
                        saveToPbBtn.disabled = false;
                        saveToPbBtn.textContent = 'Salvar Alteracoes no PocketBase';
                        saveToPbBtn.style.display = 'none';
                    }, 2500);
                } else {
                    alert('Erro ao salvar: ' + (data.message || JSON.stringify(data.data)));
                    saveToPbBtn.disabled = false;
                    saveToPbBtn.textContent = 'Salvar Alteracoes no PocketBase';
                }
            } catch (err) {
                alert('Erro de conexao ao salvar.');
                saveToPbBtn.disabled = false;
                saveToPbBtn.textContent = 'Salvar Alteracoes no PocketBase';
            }
        });
    }

    // ==========================================
    // 6. ESTILOS EXTRAS
    // ==========================================
    var extraStyles = document.createElement('style');
    extraStyles.innerHTML = [
        '.quick-remove-btn{position:absolute;top:10px;right:10px;width:24px;height:24px;background-color:rgba(226,6,19,0.9);color:white;border:none;border-radius:50%;font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;box-shadow:0 2px 5px rgba(0,0,0,0.2);transition:background-color 0.2s,transform 0.1s}',
        '.quick-remove-btn:hover{background-color:rgba(184,5,15,1);transform:scale(1.1)}',
        '.mockup-banner-area.dragover{transform:scale(0.98);border:3px dashed var(--color-primary) !important;background-color:rgba(0,75,147,0.1) !important}',
        '.fixed-ad-container{margin-top:10px;border:1px solid var(--color-border);border-radius:8px;overflow:hidden}',
        '#btn-save-to-pb{display:block;width:100%;margin-top:10px;background-color:#10b981 !important;color:white !important;font-weight:700;border-radius:8px;padding:12px;text-align:center;cursor:pointer;border:none;font-family:var(--font-main);font-size:13px;transition:background-color 0.2s}',
        '#btn-save-to-pb:hover:not(:disabled){background-color:#059669 !important}',
        '#btn-save-to-pb:disabled{cursor:not-allowed;opacity:0.75}'
    ].join('');
    document.head.appendChild(extraStyles);

    setTimeout(function() { if (mockupPanel) mockupPanel.classList.remove('collapsed'); }, 500);
});
