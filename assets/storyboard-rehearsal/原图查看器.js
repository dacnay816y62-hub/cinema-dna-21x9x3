/* 统一的原图查看器。仅改变查看视图；不改图片、选区、分组与项目存档。 */
(() => {
  let viewer, stage, picture, sizeLabel, scaleLabel, message, returnFocus, returnScroll;
  let scale = 1, fitScale = 1, x = 0, y = 0, ready = false, pan = null, loadToken = 0;
  let sourceGesture = null, suppressUntil = 0, decorateFrame = 0;
  const imageScope = '.workspace img, #modalContent img';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function imageTarget(target) {
    if (!(target instanceof Element) || target.closest('#imageViewer')) return null;
    const viewButton = target.closest('[data-action="view"]');
    if (viewButton) {
      const item = shot(viewButton.dataset.id);
      return item ? {src:imageOf(item), title:item.title, name:media[item.assetId]?.name, opener:viewButton} : null;
    }
    if (target.closest('input,select,textarea,a,.library-trash,.reference-check,[data-drag],[data-drag-reference]')) return null;
    const image = target.closest('img') || target.closest('.thumb,.reference-thumb,.library-thumb,.support-item,.female-reference-image')?.querySelector('img');
    if (!image || !image.matches(imageScope) || !image.getAttribute('src')) return null;
    const card = image.closest('[data-lib-id],[data-reference],[data-binding],.shot[data-id],[data-lib-action="bind-one"]');
    const item = card?.matches('.shot') ? shot(card.dataset.id)
      : refAsset(card?.dataset.libId || card?.dataset.reference || card?.dataset.binding || card?.dataset.id);
    return {src:image.currentSrc || image.src, title:item?.title || image.alt || '图片原图',
      name:item ? media[item.assetId]?.name : '', opener:image};
  }

  function decorateImages() {
    document.querySelectorAll(imageScope).forEach(image => {
      image.dataset.detailImage = 'true';
      image.title = '点击查看原图 · 滚轮缩放 · 左键拖动';
      // 不改原有复用、勾选、删除与拖动控件；图片自身增加键盘查看入口。
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-haspopup', 'dialog');
      image.setAttribute('aria-label', '放大查看 ' + (image.alt || '图片原图'));
    });
  }

  function paint() {
    if (!ready) return;
    const width = picture.naturalWidth * scale, height = picture.naturalHeight * scale;
    x = width <= stage.clientWidth ? (stage.clientWidth - width) / 2 : clamp(x, stage.clientWidth - width - 32, 32);
    y = height <= stage.clientHeight ? (stage.clientHeight - height) / 2 : clamp(y, stage.clientHeight - height - 32, 32);
    picture.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    scaleLabel.value = Math.round(scale * 100) + '%';
    scaleLabel.textContent = scaleLabel.value;
    stage.classList.toggle('can-pan', width > stage.clientWidth || height > stage.clientHeight);
  }

  function fit() {
    if (!ready) return;
    fitScale = Math.min(1, Math.max(1, stage.clientWidth - 48) / picture.naturalWidth,
      Math.max(1, stage.clientHeight - 48) / picture.naturalHeight);
    scale = fitScale;
    x = (stage.clientWidth - picture.naturalWidth * scale) / 2;
    y = (stage.clientHeight - picture.naturalHeight * scale) / 2;
    paint();
  }

  function zoom(next, clientX, clientY) {
    if (!ready) return;
    const rect = stage.getBoundingClientRect();
    const anchorX = clientX == null ? rect.width / 2 : clientX - rect.left;
    const anchorY = clientY == null ? rect.height / 2 : clientY - rect.top;
    next = clamp(next, Math.min(fitScale / 4, 0.1), 16);
    x = anchorX - (anchorX - x) * next / scale;
    y = anchorY - (anchorY - y) * next / scale;
    scale = next;
    paint();
  }

  function finishPan() {
    const pointer = pan?.id; pan = null;
    stage?.classList.remove('is-panning');
    if (pointer != null && stage.hasPointerCapture(pointer)) stage.releasePointerCapture(pointer);
  }

  function buildViewer() {
    if (viewer) return;
    // 兼容旧版便携导出里残留的临时查看层。
    document.getElementById('imageViewer')?.remove();
    viewer = document.createElement('dialog');
    viewer.id = 'imageViewer';
    viewer.setAttribute('aria-labelledby', 'imageViewerTitle');
    viewer.setAttribute('aria-describedby', 'imageViewerHelp');
    viewer.innerHTML = `<div class="image-viewer-bar"><div class="image-viewer-name"><h2 id="imageViewerTitle"></h2><span id="imageViewerSize"></span></div><div class="image-viewer-tools"><button type="button" data-image-tool="out" aria-label="缩小图片">−</button><output id="imageViewerScale" aria-label="当前缩放比例">—</output><button type="button" data-image-tool="in" aria-label="放大图片">＋</button><button type="button" data-image-tool="fit">适应窗口</button><button type="button" data-image-tool="actual" title="按原图像素查看">100%</button><button type="button" data-image-tool="close" aria-label="关闭大图查看器" title="关闭（Esc）">×</button></div></div><div id="imageViewerStage" class="image-viewer-stage"><img id="imageViewerPicture" alt="" draggable="false"><p id="imageViewerMessage" role="status">正在载入原图…</p></div><p id="imageViewerHelp">滚轮缩放 · 左键拖动 · 双击还原 · Esc 退出</p>`;
    document.body.append(viewer);
    stage = viewer.querySelector('#imageViewerStage');
    picture = viewer.querySelector('#imageViewerPicture');
    sizeLabel = viewer.querySelector('#imageViewerSize');
    scaleLabel = viewer.querySelector('#imageViewerScale');
    message = viewer.querySelector('#imageViewerMessage');
    viewer.addEventListener('click', event => {
      const tool = event.target.closest('[data-image-tool]')?.dataset.imageTool;
      if (tool === 'close') viewer.close();
      if (tool === 'fit') fit();
      if (tool === 'actual') zoom(1);
      if (tool === 'in') zoom(scale * 1.25);
      if (tool === 'out') zoom(scale / 1.25);
      event.stopPropagation();
    });
    viewer.addEventListener('wheel', event => {
      event.preventDefault(); event.stopPropagation();
      if (!stage.contains(event.target)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
      zoom(scale * Math.exp(-clamp(event.deltaY * unit, -240, 240) * 0.002), event.clientX, event.clientY);
    }, {passive:false});
    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !ready || pan) return;
      event.preventDefault(); event.stopPropagation();
      pan = {id:event.pointerId, startX:event.clientX, startY:event.clientY, x, y};
      stage.setPointerCapture(event.pointerId); stage.classList.add('is-panning');
    });
    stage.addEventListener('pointermove', event => {
      if (!pan || pan.id !== event.pointerId) return;
      event.preventDefault(); event.stopPropagation();
      x = pan.x + event.clientX - pan.startX; y = pan.y + event.clientY - pan.startY; paint();
    });
    stage.addEventListener('pointerup', finishPan);
    stage.addEventListener('pointercancel', finishPan);
    stage.addEventListener('lostpointercapture', finishPan);
    stage.addEventListener('dragstart', event => event.preventDefault());
    stage.addEventListener('dblclick', event => {event.preventDefault(); event.stopPropagation(); fit();});
    viewer.addEventListener('cancel', event => {event.preventDefault(); viewer.close();});
    viewer.addEventListener('close', () => {
      finishPan(); ready = false; loadToken++;
      picture.removeAttribute('src'); picture.style.transform = '';
      if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
      if (returnScroll) window.scrollTo({left:returnScroll.x,top:returnScroll.y,behavior:'instant'});
    });
  }

  function openImage(info) {
    if (!info?.src) return;
    buildViewer();
    finishPaint(); closeQuickMenu();
    returnFocus = info.opener;
    returnScroll = {x:window.scrollX,y:window.scrollY};
    ready = false; pan = null; picture.hidden = true;
    message.hidden = false; message.textContent = '正在载入原图…';
    viewer.querySelector('#imageViewerTitle').textContent = info.name || info.title;
    picture.alt = info.title;
    sizeLabel.textContent = ''; scaleLabel.textContent = '—';
    if (!viewer.open) viewer.showModal();
    viewer.querySelector('[data-image-tool="close"]').focus({preventScroll:true});
    const token = ++loadToken;
    picture.onload = () => {
      if (token !== loadToken || !viewer.open) return;
      ready = true; picture.hidden = false; message.hidden = true;
      // 显示原始像素，不用缩略图替代，也不继承「待修改」的灰度滤镜。
      picture.style.width = picture.naturalWidth + 'px';
      picture.style.height = picture.naturalHeight + 'px';
      sizeLabel.textContent = picture.naturalWidth + ' × ' + picture.naturalHeight + ' · 原图';
      fit();
    };
    picture.onerror = () => {
      if (token !== loadToken || !viewer.open) return;
      ready = false; picture.hidden = true; message.hidden = false;
      message.textContent = '这张原图暂时无法载入，请关闭后重试。';
    };
    picture.src = info.src;
  }

  // 保留滑选和素材拖入组：按下时只记录，松开后没有位移才解释为查看。
  window.addEventListener('pointerdown', event => {
    if (viewer?.open || event.button !== 0) return;
    suppressUntil = 0;
    sourceGesture = {id:event.pointerId, x:event.clientX, y:event.clientY, moved:false};
  }, true);
  window.addEventListener('pointermove', event => {
    if (sourceGesture?.id === event.pointerId && Math.hypot(event.clientX-sourceGesture.x,event.clientY-sourceGesture.y)>6) sourceGesture.moved = true;
  }, true);
  window.addEventListener('pointerup', event => {
    if (sourceGesture?.id === event.pointerId && sourceGesture.moved) suppressUntil = performance.now() + 450;
  }, true);
  window.addEventListener('dragstart', () => { if (sourceGesture) sourceGesture.moved = true; }, true);
  window.addEventListener('dragend', () => {suppressUntil = performance.now() + 450; sourceGesture = null;}, true);
  document.addEventListener('click', event => {
    if (viewer?.open) return;
    const info = imageTarget(event.target);
    if (!info) return;
    // Ctrl / Shift 仍按原有逻辑多选；复选框、垃圾桶和手柄不在图片入口内。
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.detail && (performance.now() < suppressUntil || performance.now() < suppressPaintClickUntil)) {
      event.preventDefault(); event.stopImmediatePropagation(); return;
    }
    event.preventDefault(); event.stopImmediatePropagation(); openImage(info);
  }, true);
  // 在弹窗里拦截画布快捷键，避免放大查看时误删素材、撤销或粘贴到后台。
  window.addEventListener('keydown', event => {
    if (!viewer?.open) {
      if (event.target.matches?.('[data-detail-image]') && ['Enter',' '].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation(); openImage(imageTarget(event.target));
      }
      return;
    }
    event.stopPropagation();
    if (event.key === 'Escape') {event.preventDefault(); viewer.close();}
    else if (['+','='].includes(event.key)) {event.preventDefault(); zoom(scale*1.25);}
    else if (event.key === '-') {event.preventDefault(); zoom(scale/1.25);}
    else if (event.key === '0') {event.preventDefault(); fit();}
    else if (event.key === '1') {event.preventDefault(); zoom(1);}
    else if (event.key.startsWith('Arrow')) {
      event.preventDefault(); x += event.key === 'ArrowLeft' ? 50 : event.key === 'ArrowRight' ? -50 : 0;
      y += event.key === 'ArrowUp' ? 50 : event.key === 'ArrowDown' ? -50 : 0; paint();
    }
  }, true);
  window.addEventListener('paste', event => {if(viewer?.open){event.preventDefault();event.stopImmediatePropagation();}}, true);
  window.addEventListener('resize', () => {if(viewer?.open)fit();});
  window.addEventListener('blur', finishPan);
  new MutationObserver(() => {
    cancelAnimationFrame(decorateFrame); decorateFrame = requestAnimationFrame(decorateImages);
  }).observe(document.body, {childList:true, subtree:true});
  decorateImages();
})();
