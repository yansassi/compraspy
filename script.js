document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const mockupPanel = document.getElementById('mockup-panel');
    const panelToggle = document.getElementById('panel-toggle');
    const toggleGuidesCheckbox = document.getElementById('toggle-guides');
    const siteWrapper = document.getElementById('site-wrapper');
    const resetAllBtn = document.getElementById('reset-all');

    // Mapeamento dos Banners
    // O ID do banner (ex: "lateral-esquerda") mapeia para a área visual e para o input correspondente no painel
    const bannerIds = [
        'lateral-esquerda',
        'lateral-direita',
        'topo-esquerda',
        'topo-direita',
        'topo-ofertas',
        'meio-ofertas'
    ];

    // Mapeamento de IDs do DOM para as chaves do PocketBase
    const pocketbaseMapping = {
        'lateral-esquerda': 'banner_lateral_esq',
        'lateral-direita': 'banner_lateral_dir',
        'topo-esquerda': 'banner_topo_esq',
        'topo-direita': 'banner_topo_dir',
        'topo-ofertas': 'banner_topo_ofertas',
        'meio-ofertas': 'banner_meio_ofertas'
    };

    // ==========================================
    // 1. GERENCIAMENTO DE BUSCA VIA URL
    // ==========================================

    const urlParams = new URLSearchParams(window.location.search);
    let activeSearchTerm = urlParams.get('busca') || 'xiaomi';
    activeSearchTerm = activeSearchTerm.trim().toLowerCase();

    // Sincroniza o input e o título da busca na tela com o termo ativo
    const searchInput = document.querySelector('.search-input');
    const searchButton = document.querySelector('.search-button');
    const searchResultsTitle = document.querySelector('.search-results-header h2');

    if (searchInput) {
        searchInput.value = activeSearchTerm;
    }
    
    if (searchResultsTitle) {
        searchResultsTitle.innerHTML = `${activeSearchTerm.toUpperCase()} <span class="results-count">(2314 Resultados)</span>`;
    }

    // Executa a busca recarregando a página com o parâmetro
    function handleSearchSubmit() {
        if (searchInput) {
            const term = searchInput.value.trim().toLowerCase();
            if (term) {
                window.location.href = `index.html?busca=${encodeURIComponent(term)}`;
            }
        }
    }

    if (searchButton) {
        searchButton.addEventListener('click', handleSearchSubmit);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearchSubmit();
            }
        });
    }

    // ==========================================
    // 2. GERENCIAMENTO DO PAINEL DE CONTROLE
    // ==========================================

    // Abrir/Fechar painel ao clicar na engrenagem
    if (panelToggle && mockupPanel) {
        panelToggle.addEventListener('click', () => {
            mockupPanel.classList.toggle('collapsed');
        });
    }

    // Fechar painel se o usuário clicar fora dele em telas menores
    document.addEventListener('click', (e) => {
        if (mockupPanel && panelToggle && !mockupPanel.contains(e.target) && !panelToggle.contains(e.target) && !mockupPanel.classList.contains('collapsed')) {
            mockupPanel.classList.add('collapsed');
        }
    });

    // Alternar guias de mockup (amarelo e bordas vermelhas)
    if (toggleGuidesCheckbox && siteWrapper) {
        toggleGuidesCheckbox.addEventListener('change', () => {
            if (toggleGuidesCheckbox.checked) {
                siteWrapper.classList.remove('hide-mockup-guides');
            } else {
                siteWrapper.classList.add('hide-mockup-guides');
            }
            // Salvar preferência de guias do usuário
            localStorage.setItem('mockup-show-guides', toggleGuidesCheckbox.checked);
        });
    }

    // Carregar preferência inicial de guias
    const savedGuidesPref = localStorage.getItem('mockup-show-guides');
    if (savedGuidesPref !== null && toggleGuidesCheckbox && siteWrapper) {
        const showGuides = savedGuidesPref === 'true';
        toggleGuidesCheckbox.checked = showGuides;
        if (showGuides) {
            siteWrapper.classList.remove('hide-mockup-guides');
        } else {
            siteWrapper.classList.add('hide-mockup-guides');
        }
    }

    // ==========================================
    // 3. LÓGICA DE EXIBIÇÃO E REMOÇÃO DE BANNERS
    // ==========================================

    // Função para aplicar a imagem no banner correspondente
    function applyBannerImage(bannerId, url, saveToLocal = false) {
        const bannerArea = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"]`);
        if (bannerArea) {
            bannerArea.style.backgroundImage = `url('${url}')`;
            bannerArea.classList.add('has-image');
            
            // Adiciona botão de remoção rápida na própria área
            let removeBtn = bannerArea.querySelector('.quick-remove-btn');
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.className = 'quick-remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remover esta imagem';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    clearSingleBanner(bannerId);
                });
                bannerArea.appendChild(removeBtn);
            }
        }

        if (saveToLocal) {
            try {
                localStorage.setItem(`mockup-banner-${bannerId}`, url);
            } catch (error) {
                console.warn('Erro ao salvar no localStorage:', error);
            }
        }
    }

    // Limpa apenas o visual de um banner
    function clearSingleBannerVisual(bannerId) {
        const bannerArea = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"]`);
        if (bannerArea) {
            bannerArea.style.backgroundImage = '';
            bannerArea.classList.remove('has-image');
            
            const removeBtn = bannerArea.querySelector('.quick-remove-btn');
            if (removeBtn) removeBtn.remove();
        }
    }

    // Limpa e reseta um banner completo (visual + armazenamento local)
    function clearSingleBanner(bannerId) {
        clearSingleBannerVisual(bannerId);

        // Limpa no localStorage
        localStorage.removeItem(`mockup-banner-${bannerId}`);

        // Limpa os inputs de arquivo
        const siteInput = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"] .banner-file-input`);
        const panelInput = document.querySelector(`input[data-banner="${bannerId}"]`);
        if (siteInput) siteInput.value = '';
        if (panelInput) panelInput.value = '';
    }

    // Processar arquivo de imagem selecionado localmente e salvar no cache local
    function handleFileSelect(file, bannerId) {
        if (!file || !file.type.match('image.*')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // Aplicar no DOM e salvar no localStorage localmente
            applyBannerImage(bannerId, dataUrl, true);
        };
        reader.readAsDataURL(file);
    }

    // Configurar escutas de eventos locais para upload rápido (caso o usuário teste na página pública)
    bannerIds.forEach(bannerId => {
        const bannerArea = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"]`);
        const siteInput = bannerArea ? bannerArea.querySelector('.banner-file-input') : null;
        const panelInput = document.querySelector(`input[data-banner="${bannerId}"]`);

        if (siteInput) {
            siteInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], bannerId);
                }
            });
        }

        if (panelInput) {
            panelInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], bannerId);
                    if (siteInput) {
                        siteInput.files = e.target.files;
                    }
                }
            });
        }

        // Eventos de Drag & Drop para o efeito visual de arrastar imagem
        if (bannerArea && siteInput) {
            ['dragenter', 'dragover'].forEach(eventName => {
                siteInput.addEventListener(eventName, () => {
                    bannerArea.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                siteInput.addEventListener(eventName, () => {
                    bannerArea.classList.remove('dragover');
                }, false);
            });
        }
    });

    // Limpar e resetar todos os banners locais
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            if (confirm('Tem certeza de que deseja remover todos os seus banners locais e restaurar os padrões?')) {
                bannerIds.forEach(bannerId => {
                    clearSingleBanner(bannerId);
                });
                if (mockupPanel) {
                    mockupPanel.classList.remove('collapsed');
                }
            }
        });
    }

    // ==========================================
    // 4. INTEGRAÇÃO E CARREGAMENTO DO POCKETBASE
    // ==========================================

    async function loadMockupsFromPocketBase(searchTerm) {
        if (typeof POCKETBASE_URL === 'undefined') {
            console.warn('Constante POCKETBASE_URL não está definida. Verifique o arquivo config.js.');
            return false;
        }

        try {
            // Consulta no PocketBase procurando o termo de busca exato na coleção mockups
            const response = await fetch(`${POCKETBASE_URL}/api/collections/mockups/records?filter=(search_term='${encodeURIComponent(searchTerm)}')`);
            const data = await response.json();

            if (response.ok && data.items && data.items.length > 0) {
                const record = data.items[0];
                
                // Limpa visualmente primeiro
                bannerIds.forEach(bannerId => clearSingleBannerVisual(bannerId));

                // Aplica os arquivos salvos no PocketBase
                bannerIds.forEach(bannerId => {
                    const pbKey = pocketbaseMapping[bannerId];
                    if (record[pbKey]) {
                        const fileUrl = `${POCKETBASE_URL}/api/files/${record.collectionId}/${record.id}/${record[pbKey]}`;
                        applyBannerImage(bannerId, fileUrl, false); // false = não salva no localStorage local
                    }
                });
                
                console.log(`Mockups carregados com sucesso do PocketBase para a palavra: "${searchTerm}"`);
                return true;
            }
        } catch (error) {
            console.error('Falha ao conectar com PocketBase para busca dinâmica:', error);
        }
        return false;
    }

    // Função Inicializadora de Carregamento
    async function initBanners() {
        // Tenta buscar no PocketBase pela palavra-chave ativa da busca
        const loadedFromDB = await loadMockupsFromPocketBase(activeSearchTerm);

        // Se não encontrar no PocketBase, carrega as imagens do localStorage local como fallback de testes
        if (!loadedFromDB) {
            console.log(`Termo "${activeSearchTerm}" não cadastrado no PocketBase. Usando banners salvos localmente.`);
            bannerIds.forEach(bannerId => {
                const savedImage = localStorage.getItem(`mockup-banner-${bannerId}`);
                if (savedImage) {
                    applyBannerImage(bannerId, savedImage, false);
                } else {
                    clearSingleBannerVisual(bannerId);
                }
            });
        }
    }

    // Executa inicialização
    initBanners();

    // ==========================================
    // 5. ESTILOS EXTRAS E EFEITOS
    // ==========================================

    const extraStyles = document.createElement('style');
    extraStyles.innerHTML = `
        .quick-remove-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 24px;
            height: 24px;
            background-color: rgba(226, 6, 19, 0.9);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 16px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: background-color 0.2s, transform 0.1s;
        }
        .quick-remove-btn:hover {
            background-color: rgba(184, 5, 15, 1);
            transform: scale(1.1);
        }
        .mockup-banner-area.dragover {
            transform: scale(0.98);
            border: 3px dashed var(--color-primary) !important;
            background-color: rgba(0, 75, 147, 0.1) !important;
        }
        .fixed-ad-container {
            margin-top: 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            overflow: hidden;
        }
    `;
    document.head.appendChild(extraStyles);
    
    // Animação inicial
    setTimeout(() => {
        if (mockupPanel) {
            mockupPanel.classList.remove('collapsed');
        }
    }, 500);
});
