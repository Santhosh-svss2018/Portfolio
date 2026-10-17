/**
 * ============================================================================
 * PORTFOLIO VOICE CONTROLLER & UI INTEGRATION
 * Manages Web Speech API synthesis, audio controls, voice settings, and UI synchronization.
 * Supports automatic welcome narration on page load with graceful fallback.
 * ============================================================================
 */

(function () {
  'use strict';

  class PortfolioVoiceController {
    constructor() {
      this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
      this.synth = this.isSupported ? window.speechSynthesis : null;
      
      this.state = {
        isEnabled: true, // Voice experience active by default; no prerequisite click required
        status: 'idle', // 'idle' | 'playing' | 'paused' | 'completed' | 'stopped' | 'error'
        currentTrack: null, // { id, title, subtitle, text }
        isMuted: false,
        rate: 1.0,
        pitch: 1.0,
        selectedVoiceURI: null,
        voices: [],
        autoplayBlocked: false,
        welcomeStartedOnce: false
      };

      this.activeUtterance = null;
      this.watchdogTimer = null;
      this.autoplayCheckTimer = null;
      this.welcomeAutoplayAttempted = false;
      this.listeners = new Set();

      this.initSettings();
      if (this.isSupported) {
        this.initVoices();
      }
    }

    initSettings() {
      try {
        const savedVoice = localStorage.getItem('portfolio_voice_uri');
        const savedRate = localStorage.getItem('portfolio_voice_rate');
        const savedPitch = localStorage.getItem('portfolio_voice_pitch');

        if (savedVoice) this.state.selectedVoiceURI = savedVoice;
        if (savedRate) this.state.rate = parseFloat(savedRate) || 1.0;
        if (savedPitch) this.state.pitch = parseFloat(savedPitch) || 1.0;
      } catch (err) {
        console.warn('[VoiceController] Storage access restricted:', err);
      }
    }

    initVoices() {
      const updateVoices = () => {
        const allVoices = this.synth.getVoices() || [];
        // Filter English voices
        const englishVoices = allVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
        this.state.voices = englishVoices.length > 0 ? englishVoices : allVoices;

        // Auto-select preferred natural voice if none selected
        if (!this.state.selectedVoiceURI && this.state.voices.length > 0) {
          const naturalVoice = this.pickBestEnglishVoice(this.state.voices);
          if (naturalVoice) {
            this.state.selectedVoiceURI = naturalVoice.voiceURI;
          }
        }
        this.notify('voiceschanged', { voices: this.state.voices });
      };

      updateVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = updateVoices;
      }
    }

    pickBestEnglishVoice(voices) {
      if (!voices || voices.length === 0) return null;

      const naturalKeywords = [
        /natural/i,
        /neural/i,
        /online/i,
        /google us english/i,
        /google uk english/i,
        /google/i,
        /samantha/i,
        /daniel/i,
        /karen/i,
        /serena/i,
        /jenny/i,
        /aria/i,
        /guy/i
      ];

      for (const regex of naturalKeywords) {
        const found = voices.find(v => regex.test(v.name));
        if (found) return found;
      }

      return voices.find(v => v.lang === 'en-US') ||
             voices.find(v => v.lang === 'en-GB') ||
             voices[0];
    }

    getSelectedVoice() {
      if (!this.state.voices || this.state.voices.length === 0) return null;
      if (this.state.selectedVoiceURI) {
        const match = this.state.voices.find(v => v.voiceURI === this.state.selectedVoiceURI);
        if (match) return match;
      }
      return this.pickBestEnglishVoice(this.state.voices);
    }

    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    notify(event, payload = {}) {
      this.listeners.forEach(fn => {
        try {
          fn(event, { ...this.state, ...payload });
        } catch (err) {
          console.error('[VoiceController] Listener error:', err);
        }
      });
    }

    startWatchdog() {
      this.stopWatchdog();
      // Prevents Chrome Web Speech timeout/garbage collection pause on longer paragraphs
      this.watchdogTimer = setInterval(() => {
        if (this.synth && this.synth.speaking && !this.synth.paused) {
          try {
            this.synth.pause();
            this.synth.resume();
          } catch (e) {}
        }
      }, 10000);
    }

    stopWatchdog() {
      if (this.watchdogTimer) {
        clearInterval(this.watchdogTimer);
        this.watchdogTimer = null;
      }
    }

    /**
     * Automatically attempts to play ONLY the welcome narration on homepage load.
     * Respects browser autoplay restrictions and handles fallback cleanly.
     * Runs strictly once per page load.
     */
    attemptWelcomeAutoplay() {
      if (this.welcomeAutoplayAttempted) return;
      this.welcomeAutoplayAttempted = true;

      if (!this.isSupported || !this.synth) {
        this.notify('unsupported');
        return;
      }

      this.play('welcome', null, { isAutoplay: true });
    }

    play(trackId, textOverride = null, options = {}) {
      if (!this.isSupported || !this.synth) {
        this.notify('unsupported');
        return;
      }

      const isAutoplay = !!options.isAutoplay;

      // Resolve track data from registry
      const trackData = (window.PORTFOLIO_VOICE_DATA && window.PORTFOLIO_VOICE_DATA[trackId]) || {
        id: trackId,
        title: trackId,
        subtitle: 'Voice Narration',
        text: textOverride || ''
      };

      const narrationText = textOverride || trackData.text;
      if (!narrationText) {
        console.warn('[VoiceController] No text provided for track:', trackId);
        return;
      }

      // If already playing the SAME track, toggle pause/resume (unless autoplay attempt)
      if (!isAutoplay && this.state.currentTrack && this.state.currentTrack.id === trackId) {
        if (this.state.status === 'playing') {
          this.pause();
          return;
        } else if (this.state.status === 'paused') {
          this.resume();
          return;
        }
      }

      // Single shared speech controller: STOP any previous active speech immediately.
      // If welcome was playing and a project button is clicked, welcome stops first!
      this.stop(false);

      if (this.autoplayCheckTimer) {
        clearTimeout(this.autoplayCheckTimer);
        this.autoplayCheckTimer = null;
      }

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(narrationText);
          const voice = this.getSelectedVoice();
          if (voice) utterance.voice = voice;

          utterance.rate = Math.max(0.7, Math.min(1.6, this.state.rate));
          utterance.pitch = Math.max(0.7, Math.min(1.3, this.state.pitch));
          utterance.volume = this.state.isMuted ? 0 : 1;

          this.state.currentTrack = trackData;
          this.activeUtterance = utterance;
          window.__portfolioActiveUtterance = utterance; // Prevent garbage collection

          utterance.onstart = () => {
            if (this.autoplayCheckTimer) {
              clearTimeout(this.autoplayCheckTimer);
              this.autoplayCheckTimer = null;
            }
            this.state.status = 'playing';
            this.state.autoplayBlocked = false;
            if (trackId === 'welcome') {
              this.state.welcomeStartedOnce = true;
            }
            this.startWatchdog();
            this.notify('start', { track: trackData });
          };

          utterance.onpause = () => {
            this.state.status = 'paused';
            this.stopWatchdog();
            this.notify('pause', { track: trackData });
          };

          utterance.onresume = () => {
            this.state.status = 'playing';
            this.startWatchdog();
            this.notify('resume', { track: trackData });
          };

          utterance.onend = () => {
            this.state.status = 'completed';
            this.stopWatchdog();
            this.activeUtterance = null;
            window.__portfolioActiveUtterance = null;
            this.notify('end', { track: trackData });
          };

          utterance.onerror = (e) => {
            if (this.autoplayCheckTimer) {
              clearTimeout(this.autoplayCheckTimer);
              this.autoplayCheckTimer = null;
            }
            this.stopWatchdog();
            this.activeUtterance = null;
            window.__portfolioActiveUtterance = null;

            if (e.error === 'canceled' || e.error === 'interrupted') {
              this.state.status = 'stopped';
              this.notify('stop', { track: trackData });
            } else if (e.error === 'not-allowed' || isAutoplay) {
              console.info('[VoiceController] Autoplay restricted by browser policy. Displaying "Play Welcome Message" button.');
              this.state.status = 'idle';
              this.state.autoplayBlocked = true;
              this.notify('autoplayblocked', { track: trackData });
            } else {
              console.warn('[VoiceController] Speech synthesis error:', e.error);
              this.state.status = 'error';
              this.notify('error', { error: e.error, track: trackData });
            }
          };

          if (isAutoplay) {
            // In Chromium, if speech is blocked on load without a user gesture,
            // speak() may remain pending indefinitely without firing onerror.
            // We check within 650ms if onstart fired; if not, show "Play Welcome Message".
            this.autoplayCheckTimer = setTimeout(() => {
              if (this.state.status !== 'playing' && !this.state.welcomeStartedOnce) {
                try { this.synth.cancel(); } catch (e) {}
                this.state.status = 'idle';
                this.state.autoplayBlocked = true;
                this.notify('autoplayblocked', { track: trackData });
              }
            }, 650);
          }

          this.synth.speak(utterance);
        } catch (err) {
          console.error('[VoiceController] Failed to play utterance:', err);
          if (isAutoplay) {
            this.state.status = 'idle';
            this.state.autoplayBlocked = true;
            this.notify('autoplayblocked', { track: trackData });
          } else {
            this.state.status = 'error';
            this.notify('error', { error: err.message, track: trackData });
          }
        }
      }, 50);
    }

    pause() {
      if (!this.isSupported || !this.synth) return;
      if (this.synth.speaking && !this.synth.paused) {
        this.synth.pause();
        this.state.status = 'paused';
        this.stopWatchdog();
        this.notify('pause');
      }
    }

    resume() {
      if (!this.isSupported || !this.synth) return;
      if (this.synth.paused) {
        this.synth.resume();
        this.state.status = 'playing';
        this.startWatchdog();
        this.notify('resume');
      } else if (this.state.currentTrack && (this.state.status === 'stopped' || this.state.status === 'completed')) {
        this.play(this.state.currentTrack.id);
      }
    }

    stop(notifyUser = true) {
      if (!this.isSupported || !this.synth) return;
      this.stopWatchdog();
      if (this.autoplayCheckTimer) {
        clearTimeout(this.autoplayCheckTimer);
        this.autoplayCheckTimer = null;
      }
      try {
        this.synth.cancel();
      } catch (e) {}

      this.activeUtterance = null;
      window.__portfolioActiveUtterance = null;
      this.state.status = 'stopped';

      if (notifyUser) {
        this.notify('stop');
      }
    }

    replay() {
      if (this.state.currentTrack) {
        this.play(this.state.currentTrack.id);
      }
    }

    toggleMute() {
      this.state.isMuted = !this.state.isMuted;
      if (this.isSupported && this.synth) {
        if (this.state.status === 'playing' && this.state.currentTrack) {
          const wasPlaying = this.state.currentTrack.id;
          this.stop(false);
          this.play(wasPlaying);
        }
      }
      this.notify('mute', { isMuted: this.state.isMuted });
    }

    setRate(rate) {
      this.state.rate = rate;
      try {
        localStorage.setItem('portfolio_voice_rate', rate.toString());
      } catch (e) {}
      this.notify('settingschange');
    }

    setPitch(pitch) {
      this.state.pitch = pitch;
      try {
        localStorage.setItem('portfolio_voice_pitch', pitch.toString());
      } catch (e) {}
      this.notify('settingschange');
    }

    setVoice(voiceURI) {
      this.state.selectedVoiceURI = voiceURI;
      try {
        localStorage.setItem('portfolio_voice_uri', voiceURI);
      } catch (e) {}
      this.notify('settingschange');
    }

    testVoicePreview() {
      const sampleText = "Hello! This is a preview of the interactive voice narration for Santhosh's developer portfolio.";
      this.play('preview', sampleText);
    }
  }

  // --- UI Integration Layer ---
  document.addEventListener('DOMContentLoaded', () => {
    const controller = new PortfolioVoiceController();
    window.portfolioVoiceController = controller;

    // Elements - Welcome Panel
    const welcomePanel = document.getElementById('voiceWelcomePanel');
    const btnEnableVoice = document.getElementById('btnEnableVoice');
    const voiceActiveControls = document.getElementById('voiceActiveControls');
    const btnPlayWelcome = document.getElementById('btnPlayWelcome');
    const btnPlayWelcomeText = document.getElementById('btnPlayWelcomeText');
    const btnStopWelcome = document.getElementById('btnStopWelcome');
    const btnMuteToggle = document.getElementById('btnMuteToggle');
    const muteIconUnmuted = document.getElementById('muteIconUnmuted');
    const muteIconMuted = document.getElementById('muteIconMuted');
    const muteBtnText = document.getElementById('muteBtnText');
    const btnOpenVoiceSettings = document.getElementById('btnOpenVoiceSettings');
    const voiceWelcomeStatus = document.getElementById('voiceWelcomeStatus');
    const voiceUnsupportedNotice = document.getElementById('voiceUnsupportedNotice');

    // Elements - Floating Player
    const floatingPlayer = document.getElementById('floatingVoicePlayer');
    const playerTrackTitle = document.getElementById('playerTrackTitle');
    const playerTrackStatus = document.getElementById('playerTrackStatus');
    const playerPlayPauseBtn = document.getElementById('playerPlayPauseBtn');
    const playerPlayIcon = document.getElementById('playerPlayIcon');
    const playerPauseIcon = document.getElementById('playerPauseIcon');
    const playerReplayBtn = document.getElementById('playerReplayBtn');
    const playerStopBtn = document.getElementById('playerStopBtn');
    const playerMuteBtn = document.getElementById('playerMuteBtn');
    const playerMuteIcon = document.getElementById('playerMuteIcon');
    const playerUnmuteIcon = document.getElementById('playerUnmuteIcon');
    const playerSettingsBtn = document.getElementById('playerSettingsBtn');
    const playerCloseBtn = document.getElementById('playerCloseBtn');

    // Elements - Voice Settings Modal
    const voiceSettingsModal = document.getElementById('voiceSettingsModal');
    const voiceSettingsCloseBtn = document.getElementById('voiceSettingsCloseBtn');
    const btnApplyVoiceSettings = document.getElementById('btnApplyVoiceSettings');
    const voiceSelect = document.getElementById('voiceSelect');
    const voiceRateSlider = document.getElementById('voiceRateSlider');
    const voiceRateValue = document.getElementById('voiceRateValue');
    const voicePitchSlider = document.getElementById('voicePitchSlider');
    const voicePitchValue = document.getElementById('voicePitchValue');
    const btnTestVoice = document.getElementById('btnTestVoice');
    const btnResetVoiceSettings = document.getElementById('btnResetVoiceSettings');

    // Elements - Project Cards
    const projectVoiceBtns = document.querySelectorAll('.btn-project-voice');

    // Check Browser Support
    if (!controller.isSupported) {
      if (btnEnableVoice) btnEnableVoice.style.display = 'none';
      if (voiceActiveControls) voiceActiveControls.style.display = 'none';
      if (voiceUnsupportedNotice) voiceUnsupportedNotice.style.display = 'inline-flex';
      if (voiceWelcomeStatus) voiceWelcomeStatus.textContent = 'Voice Narration Not Supported';
      projectVoiceBtns.forEach(btn => {
        btn.disabled = true;
        btn.title = 'Voice narration is not supported in this browser';
        btn.style.opacity = '0.5';
      });
      return;
    }

    // Populate Voice Select in Settings Modal
    function populateVoiceList() {
      if (!voiceSelect) return;
      const voices = controller.state.voices;
      voiceSelect.innerHTML = '';

      if (voices.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Default System Voice (English)';
        voiceSelect.appendChild(opt);
        return;
      }

      const selectedVoice = controller.getSelectedVoice();

      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        const isSelected = selectedVoice && selectedVoice.voiceURI === voice.voiceURI;
        option.selected = isSelected;
        
        let label = `${voice.name} (${voice.lang})`;
        if (voice.default) label += ' — System Default';
        option.textContent = label;
        voiceSelect.appendChild(option);
      });
    }

    // Update Slider Badges
    function updateRateDisplay(rate) {
      if (!voiceRateValue) return;
      const formatted = rate.toFixed(2);
      if (Math.abs(rate - 1.0) < 0.05) {
        voiceRateValue.textContent = '1.0x (Normal)';
      } else {
        voiceRateValue.textContent = `${formatted}x`;
      }
    }

    function updatePitchDisplay(pitch) {
      if (!voicePitchValue) return;
      const formatted = pitch.toFixed(2);
      if (Math.abs(pitch - 1.0) < 0.05) {
        voicePitchValue.textContent = '1.0 (Normal)';
      } else {
        voicePitchValue.textContent = formatted;
      }
    }

    // Initial slider values
    if (voiceRateSlider) {
      voiceRateSlider.value = controller.state.rate.toString();
      updateRateDisplay(controller.state.rate);
    }
    if (voicePitchSlider) {
      voicePitchSlider.value = controller.state.pitch.toString();
      updatePitchDisplay(controller.state.pitch);
    }

    // UI Synchronizer
    function syncUI(event, state) {
      const isSpeaking = state.status === 'playing';
      const isPaused = state.status === 'paused';
      const isCompleted = state.status === 'completed';
      const currentId = state.currentTrack ? state.currentTrack.id : null;

      // 1. Welcome Panel UI
      const isWelcomeSpeaking = currentId === 'welcome' && isSpeaking;
      const isWelcomePaused = currentId === 'welcome' && isPaused;

      // If autoplay was blocked or welcome hasn't started yet, show the "Play Welcome Message" button
      if (state.autoplayBlocked || (!state.welcomeStartedOnce && !isWelcomeSpeaking && !isWelcomePaused)) {
        if (btnEnableVoice) {
          btnEnableVoice.style.display = 'inline-flex';
          const textSpan = btnEnableVoice.querySelector('#btnEnableVoiceText') || btnEnableVoice.querySelector('span');
          if (textSpan) textSpan.textContent = 'Play Welcome Message';
        }
        if (voiceActiveControls) voiceActiveControls.style.display = 'none';
        if (welcomePanel) welcomePanel.classList.remove('voice-enabled');
      } else {
        // Welcome was started or actively playing/paused/completed
        if (btnEnableVoice) btnEnableVoice.style.display = 'none';
        if (voiceActiveControls) voiceActiveControls.style.display = 'inline-flex';
        if (welcomePanel) welcomePanel.classList.add('voice-enabled');
      }

      // Welcome play/pause button state
      if (btnPlayWelcome && btnPlayWelcomeText) {
        if (isWelcomeSpeaking) {
          btnPlayWelcomeText.textContent = 'Pause Welcome';
          btnPlayWelcome.classList.add('is-active');
        } else if (isWelcomePaused) {
          btnPlayWelcomeText.textContent = 'Resume Welcome';
          btnPlayWelcome.classList.add('is-active');
        } else {
          btnPlayWelcomeText.textContent = currentId === 'welcome' && isCompleted ? 'Replay Welcome' : 'Play Welcome';
          btnPlayWelcome.classList.remove('is-active');
        }
      }

      // Welcome panel pulse effect
      if (welcomePanel) {
        if (isWelcomeSpeaking) {
          welcomePanel.classList.add('is-narrating');
        } else {
          welcomePanel.classList.remove('is-narrating');
        }
      }

      // Welcome status text
      if (voiceWelcomeStatus) {
        if (isWelcomeSpeaking) {
          voiceWelcomeStatus.textContent = 'Speaking Welcome Introduction...';
        } else if (isWelcomePaused) {
          voiceWelcomeStatus.textContent = 'Welcome Narration Paused';
        } else if (state.autoplayBlocked) {
          voiceWelcomeStatus.textContent = 'Click "Play Welcome Message" to start audio';
        } else if (isSpeaking && state.currentTrack) {
          voiceWelcomeStatus.textContent = `Narrating: ${state.currentTrack.title}`;
        } else if (state.welcomeStartedOnce) {
          voiceWelcomeStatus.textContent = 'Voice Experience Active • Ready';
        } else {
          voiceWelcomeStatus.textContent = 'Interactive Voice Narration';
        }
      }

      // Mute buttons in welcome panel & player
      const muted = state.isMuted;
      if (muteIconUnmuted && muteIconMuted && muteBtnText) {
        muteIconUnmuted.style.display = muted ? 'none' : 'inline-block';
        muteIconMuted.style.display = muted ? 'inline-block' : 'none';
        muteBtnText.textContent = muted ? 'Unmute' : 'Mute';
      }
      if (playerMuteIcon && playerUnmuteIcon) {
        playerMuteIcon.style.display = muted ? 'none' : 'inline-block';
        playerUnmuteIcon.style.display = muted ? 'inline-block' : 'none';
      }

      // 2. Project Card Buttons & Visual State
      projectVoiceBtns.forEach(btn => {
        const projectId = btn.getAttribute('data-project-id');
        const card = btn.closest('.project-card');
        const isCurrent = currentId === projectId;
        const textSpan = btn.querySelector('.voice-btn-text');

        if (isCurrent && isSpeaking) {
          btn.classList.add('playing');
          btn.classList.remove('paused');
          if (textSpan) textSpan.textContent = 'Pause Voice';
          if (card) {
            card.classList.add('is-speaking');
            card.classList.remove('is-paused');
          }
        } else if (isCurrent && isPaused) {
          btn.classList.add('paused');
          btn.classList.remove('playing');
          if (textSpan) textSpan.textContent = 'Resume Voice';
          if (card) {
            card.classList.add('is-paused');
            card.classList.remove('is-speaking');
          }
        } else if (isCurrent && isCompleted) {
          btn.classList.remove('playing', 'paused');
          if (textSpan) textSpan.textContent = 'Replay Voice';
          if (card) card.classList.remove('is-speaking', 'is-paused');
        } else {
          btn.classList.remove('playing', 'paused');
          if (textSpan) textSpan.textContent = 'Listen to Project';
          if (card) card.classList.remove('is-speaking', 'is-paused');
        }
      });

      // 3. Floating Player UI
      if (floatingPlayer) {
        const hasTrack = !!state.currentTrack;
        const shouldShowPlayer = hasTrack && (isSpeaking || isPaused || isCompleted);

        if (shouldShowPlayer && !floatingPlayer.classList.contains('dismissed')) {
          floatingPlayer.classList.add('visible');
        } else if (!hasTrack) {
          floatingPlayer.classList.remove('visible');
        }

        if (isSpeaking) {
          floatingPlayer.classList.add('is-speaking');
        } else {
          floatingPlayer.classList.remove('is-speaking');
        }

        if (playerTrackTitle && playerTrackStatus) {
          if (state.currentTrack) {
            playerTrackTitle.textContent = state.currentTrack.title;
            if (isSpeaking) {
              playerTrackStatus.textContent = 'Speaking audio narration...';
            } else if (isPaused) {
              playerTrackStatus.textContent = 'Narration paused';
            } else if (isCompleted) {
              playerTrackStatus.textContent = 'Narration finished • Ready to replay';
            } else {
              playerTrackStatus.textContent = state.currentTrack.subtitle || 'Audio ready';
            }
          } else {
            playerTrackTitle.textContent = 'Ready to listen';
            playerTrackStatus.textContent = 'Select "Play Welcome" or "Listen to Project"';
          }
        }

        if (playerPlayPauseBtn) {
          playerPlayPauseBtn.disabled = !hasTrack;
          if (playerPlayIcon && playerPauseIcon) {
            playerPlayIcon.style.display = isSpeaking ? 'none' : 'block';
            playerPauseIcon.style.display = isSpeaking ? 'block' : 'none';
          }
          playerPlayPauseBtn.setAttribute('aria-label', isSpeaking ? 'Pause voice narration' : 'Play voice narration');
        }

        if (playerReplayBtn) {
          playerReplayBtn.disabled = !hasTrack;
        }

        if (playerStopBtn) {
          playerStopBtn.disabled = !isSpeaking && !isPaused;
        }
      }
    }

    // Subscribe UI listener
    controller.subscribe((event, state) => {
      syncUI(event, state);
      if (event === 'voiceschanged') {
        populateVoiceList();
      }
    });

    // Populate voices initially
    populateVoiceList();
    syncUI('init', controller.state);

    // Automatically attempt to play ONLY the welcome narration on homepage load
    setTimeout(() => {
      controller.attemptWelcomeAutoplay();
    }, 150);

    // --- EVENT LISTENERS ---

    // 1. Fallback "Play Welcome Message" Button (Single Click Start)
    if (btnEnableVoice) {
      btnEnableVoice.addEventListener('click', () => {
        controller.state.autoplayBlocked = false;
        controller.play('welcome');
      });
    }

    // 2. Welcome Panel Play / Stop / Mute
    if (btnPlayWelcome) {
      btnPlayWelcome.addEventListener('click', () => {
        controller.play('welcome');
      });
    }

    if (btnStopWelcome) {
      btnStopWelcome.addEventListener('click', () => {
        controller.stop();
      });
    }

    if (btnMuteToggle) {
      btnMuteToggle.addEventListener('click', () => {
        controller.toggleMute();
      });
    }

    // 3. Project "Listen to Project" Buttons (NEVER autoplay projects; user click only)
    projectVoiceBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const projectId = btn.getAttribute('data-project-id');
        if (!projectId) return;

        // Shared controller: play() will automatically stop the welcome narration or any other active project first!
        controller.play(projectId);

        if (floatingPlayer) {
          floatingPlayer.classList.remove('dismissed');
        }
      });
    });

    // 4. Floating Player Controls
    if (playerPlayPauseBtn) {
      playerPlayPauseBtn.addEventListener('click', () => {
        if (controller.state.status === 'playing') {
          controller.pause();
        } else if (controller.state.status === 'paused') {
          controller.resume();
        } else if (controller.state.currentTrack) {
          controller.play(controller.state.currentTrack.id);
        }
      });
    }

    if (playerReplayBtn) {
      playerReplayBtn.addEventListener('click', () => {
        controller.replay();
      });
    }

    if (playerStopBtn) {
      playerStopBtn.addEventListener('click', () => {
        controller.stop();
      });
    }

    if (playerMuteBtn) {
      playerMuteBtn.addEventListener('click', () => {
        controller.toggleMute();
      });
    }

    if (playerCloseBtn) {
      playerCloseBtn.addEventListener('click', () => {
        if (floatingPlayer) {
          floatingPlayer.classList.remove('visible');
          floatingPlayer.classList.add('dismissed');
        }
      });
    }

    // 5. Voice Settings Modal Handlers
    function openVoiceSettingsModal() {
      if (!voiceSettingsModal) return;
      populateVoiceList();
      voiceSettingsModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if (voiceSelect) voiceSelect.focus();
    }

    function closeVoiceSettingsModal() {
      if (!voiceSettingsModal) return;
      voiceSettingsModal.style.display = 'none';
      document.body.style.overflow = '';
      if (controller.state.currentTrack && controller.state.currentTrack.id === 'preview') {
        controller.stop(false);
      }
    }

    if (btnOpenVoiceSettings) {
      btnOpenVoiceSettings.addEventListener('click', openVoiceSettingsModal);
    }
    if (playerSettingsBtn) {
      playerSettingsBtn.addEventListener('click', openVoiceSettingsModal);
    }
    if (voiceSettingsCloseBtn) {
      voiceSettingsCloseBtn.addEventListener('click', closeVoiceSettingsModal);
    }
    if (btnApplyVoiceSettings) {
      btnApplyVoiceSettings.addEventListener('click', closeVoiceSettingsModal);
    }

    // Close on backdrop click
    if (voiceSettingsModal) {
      voiceSettingsModal.addEventListener('click', (e) => {
        if (e.target === voiceSettingsModal || e.target.classList.contains('voice-modal-backdrop')) {
          closeVoiceSettingsModal();
        }
      });
    }

    // Voice Selection Change
    if (voiceSelect) {
      voiceSelect.addEventListener('change', () => {
        const selectedVal = voiceSelect.value;
        controller.setVoice(selectedVal);
      });
    }

    // Rate slider change
    if (voiceRateSlider) {
      voiceRateSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        updateRateDisplay(val);
        controller.setRate(val);
      });
    }

    // Pitch slider change
    if (voicePitchSlider) {
      voicePitchSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 1.0;
        updatePitchDisplay(val);
        controller.setPitch(val);
      });
    }

    // Test Voice Preview Button
    if (btnTestVoice) {
      btnTestVoice.addEventListener('click', () => {
        controller.testVoicePreview();
      });
    }

    // Reset Voice Settings Button
    if (btnResetVoiceSettings) {
      btnResetVoiceSettings.addEventListener('click', () => {
        controller.setRate(1.0);
        controller.setPitch(1.0);
        if (voiceRateSlider) {
          voiceRateSlider.value = '1.0';
          updateRateDisplay(1.0);
        }
        if (voicePitchSlider) {
          voicePitchSlider.value = '1.0';
          updatePitchDisplay(1.0);
        }
        const defaultVoice = controller.pickBestEnglishVoice(controller.state.voices);
        if (defaultVoice) {
          controller.setVoice(defaultVoice.voiceURI);
          if (voiceSelect) voiceSelect.value = defaultVoice.voiceURI;
        }
      });
    }

    // Escape Key listener for settings modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && voiceSettingsModal && voiceSettingsModal.style.display !== 'none') {
        closeVoiceSettingsModal();
      }
    });

    // Cleanup when leaving page
    window.addEventListener('beforeunload', () => {
      controller.stop(false);
    });
    window.addEventListener('pagehide', () => {
      controller.stop(false);
    });
  });
})();
