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

    // ==========================================
    // 1. GERENCIAMENTO DO PAINEL DE CONTROLE
    // ==========================================

    // Abrir/Fechar painel ao clicar na engrenagem
    panelToggle.addEventListener('click', () => {
        mockupPanel.classList.toggle('collapsed');
    });

    // Fechar painel se o usuário clicar fora dele em telas menores
    document.addEventListener('click', (e) => {
        if (!mockupPanel.contains(e.target) && !panelToggle.contains(e.target) && !mockupPanel.classList.contains('collapsed')) {
            mockupPanel.classList.add('collapsed');
        }
    });

    // Alternar guias de mockup (amarelo e bordas vermelhas)
    toggleGuidesCheckbox.addEventListener('change', () => {
        if (toggleGuidesCheckbox.checked) {
            siteWrapper.classList.remove('hide-mockup-guides');
        } else {
            siteWrapper.classList.add('hide-mockup-guides');
        }
        // Salvar preferência de guias do usuário
        localStorage.setItem('mockup-show-guides', toggleGuidesCheckbox.checked);
    });

    // Carregar preferência inicial de guias
    const savedGuidesPref = localStorage.getItem('mockup-show-guides');
    if (savedGuidesPref !== null) {
        const showGuides = savedGuidesPref === 'true';
        toggleGuidesCheckbox.checked = showGuides;
        if (showGuides) {
            siteWrapper.classList.remove('hide-mockup-guides');
        } else {
            siteWrapper.classList.add('hide-mockup-guides');
        }
    }

    // ==========================================
    // 2. LÓGICA DE UPLOAD E LEITURA DE IMAGENS
    // ==========================================

    // Função para aplicar a imagem no banner correspondente
    function applyBannerImage(bannerId, dataUrl) {
        const bannerArea = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"]`);
        if (bannerArea) {
            bannerArea.style.backgroundImage = `url('${dataUrl}')`;
            bannerArea.classList.add('has-image');
            
            // Opcional: Adiciona um botão de remoção rápida na própria área
            let removeBtn = bannerArea.querySelector('.quick-remove-btn');
            if (!removeBtn) {
                removeBtn = document.createElement('button');
                removeBtn.className = 'quick-remove-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remover esta imagem';
                // Impedir que o clique no botão abra o seletor de arquivos
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    clearSingleBanner(bannerId);
                });
                bannerArea.appendChild(removeBtn);
            }
        }
    }

    // Função para limpar apenas um banner
    function clearSingleBanner(bannerId) {
        const bannerArea = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"]`);
        if (bannerArea) {
            bannerArea.style.backgroundImage = '';
            bannerArea.classList.remove('has-image');
            
            // Remove botão de remoção rápida se existir
            const removeBtn = bannerArea.querySelector('.quick-remove-btn');
            if (removeBtn) removeBtn.remove();
        }

        // Limpa no localStorage
        localStorage.removeItem(`mockup-banner-${bannerId}`);

        // Limpa os inputs de arquivo
        const siteInput = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"] .banner-file-input`);
        const panelInput = document.querySelector(`input[data-banner="${bannerId}"]`);
        if (siteInput) siteInput.value = '';
        if (panelInput) panelInput.value = '';
    }

    // Processar arquivo de imagem selecionado e salvar
    function handleFileSelect(file, bannerId) {
        if (!file || !file.type.match('image.*')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // Aplicar no DOM
            applyBannerImage(bannerId, dataUrl);
            
            // Salvar no localStorage para persistência
            try {
                localStorage.setItem(`mockup-banner-${bannerId}`, dataUrl);
            } catch (error) {
                console.warn('Erro ao salvar no localStorage. A imagem pode ser muito grande:', error);
                alert('Aviso: A imagem é muito grande para ser persistida entre recarregamentos, mas continuará visível nesta sessão.');
            }
        };
        reader.readAsDataURL(file);
    }

    // Configurar escutas de eventos para as áreas do site e inputs do painel
    bannerIds.forEach(bannerId => {
        const bannerArea = document.querySelector(`.mockup-banner-area[data-banner-id="${bannerId}"]`);
        const siteInput = bannerArea ? bannerArea.querySelector('.banner-file-input') : null;
        const panelInput = document.querySelector(`input[data-banner="${bannerId}"]`);

        // Sincronizar input do site direto
        if (siteInput) {
            siteInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], bannerId);
                }
            });
        }

        // Sincronizar input do painel lateral
        if (panelInput) {
            panelInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], bannerId);
                    
                    // Sincroniza também o input no site para consistência
                    if (siteInput) {
                        // Criar uma cópia dos arquivos no input do site
                        siteInput.files = e.target.files;
                    }
                }
            });
        }

        // ==========================================
        // 3. EFEITOS DE DRAG & DROP
        // ==========================================
        if (bannerArea && siteInput) {
            // Quando arrasta um arquivo sobre a área do banner
            ['dragenter', 'dragover'].forEach(eventName => {
                siteInput.addEventListener(eventName, () => {
                    bannerArea.classList.add('dragover');
                }, false);
            });

            // Quando sai com o arquivo arrastado
            ['dragleave', 'drop'].forEach(eventName => {
                siteInput.addEventListener(eventName, () => {
                    bannerArea.classList.remove('dragover');
                }, false);
            });
        }

        // ==========================================
        // 4. CARREGAR IMAGENS SALVAS NO INÍCIO
        // ==========================================
        const savedImage = localStorage.getItem(`mockup-banner-${bannerId}`);
        if (savedImage) {
            applyBannerImage(bannerId, savedImage);
        }
    });

    // ==========================================
    // 5. LIMPAR E RESETAR TUDO
    // ==========================================
    resetAllBtn.addEventListener('click', () => {
        if (confirm('Tem certeza de que deseja remover todos os seus banners customizados?')) {
            bannerIds.forEach(bannerId => {
                clearSingleBanner(bannerId);
            });
            // Opcional: Reabre o painel para o usuário ver
            mockupPanel.classList.remove('collapsed');
        }
    });

    // Adicionar estilos CSS adicionais para o botão de remoção rápida dinamicamente
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
        /* Garantir que o anúncio fixo tenha estilo se necessário */
        .fixed-ad-container {
            margin-top: 10px;
            border: 1px solid var(--color-border);
            border-radius: 8px;
            overflow: hidden;
        }
    `;
    document.head.appendChild(extraStyles);
    
    // Animação inicial: Mostrar o painel por 2 segundos e depois recolhê-lo para indicar a existência do recurso
    setTimeout(() => {
        mockupPanel.classList.remove('collapsed');
        setTimeout(() => {
            // Só recolhe se o usuário ainda não tiver clicado ou interagido nele
            if (mockupPanel.classList.contains('collapsed') === false) {
                // mockupPanel.classList.add('collapsed'); // Opcional: pode iniciar aberto ou fechar após tempo
            }
        }, 3000);
    }, 500);
});
