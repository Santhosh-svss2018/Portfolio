/**
 * ============================================================================
 * SANTHOSH SEKAR - PORTFOLIO INTERACTIVITY & SCRIPTS
 * Features: Typewriter, Lightbox Modal, Filter, Scrollspy, Toasts & Copy-to-Clipboard
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. Reading / Scroll Progress Bar ---
  const progressBar = document.querySelector('.scroll-progress-bar');
  const siteNav = document.querySelector('.site-nav');
  const backToTopBtn = document.querySelector('.btn-back-to-top');

  window.addEventListener('scroll', () => {
    const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (progressBar && totalScroll > 0) {
      const percentage = (currentScroll / totalScroll) * 100;
      progressBar.style.width = `${percentage}%`;
    }

    // Nav shadow toggle on scroll
    if (siteNav) {
      if (currentScroll > 30) {
        siteNav.classList.add('scrolled');
      } else {
        siteNav.classList.remove('scrolled');
      }
    }

    // Back to top button visibility
    if (backToTopBtn) {
      if (currentScroll > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- 2. Dynamic Role Typewriter ---
  const typingElement = document.querySelector('.role-typing');
  if (typingElement) {
    const roles = [
      'Full Stack Web Developer',
      'Frontend Engineer',
      'CSE Undergrad @ Jeppiaar',
      'Python & GenAI Builder',
      'Creative UI/UX Designer'
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 90;

    function typeEffect() {
      const currentRole = roles[roleIndex];
      
      if (isDeleting) {
        typingElement.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 45;
      } else {
        typingElement.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 85;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        // Pause at full word
        isDeleting = true;
        typingSpeed = 1600;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typingSpeed = 400;
      }

      setTimeout(typeEffect, typingSpeed);
    }

    typeEffect();
  }

  // --- 3. Mobile Navigation Drawer ---
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isActive = navMenu.classList.toggle('active');
      mobileToggle.setAttribute('aria-expanded', isActive);
      mobileToggle.innerHTML = isActive 
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          mobileToggle.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
        }
      });
    });
  }

  // --- 4. Active Section Scroll Spy ---
  const sections = document.querySelectorAll('section[id]');
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -65% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const activeId = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${activeId}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(sec => observer.observe(sec));

  // --- 5. Certificates Category Filtering ---
  const filterButtons = document.querySelectorAll('.cert-filter-btn');
  const certCards = document.querySelectorAll('.cert-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.getAttribute('data-filter');

      certCards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filterValue === 'all' || category === filterValue || category.includes(filterValue)) {
          card.style.display = 'flex';
          card.style.animation = 'fadeInCard 0.4s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // --- 6. Certificate Lightbox Modal ---
  const certModal = document.getElementById('certModal');
  const modalImg = document.getElementById('modalCertImg');
  const modalTitle = document.getElementById('modalCertTitle');
  const modalIssuer = document.getElementById('modalCertIssuer');
  const modalOpenBtn = document.getElementById('modalOpenDirect');
  const modalPdfBtn = document.getElementById('modalDownloadPdf');
  const modalCloseBtn = document.querySelector('.cert-modal-close');

  function openCertificateModal(card) {
    if (!certModal) return;
    const title = card.getAttribute('data-title') || 'Certificate';
    const issuer = card.getAttribute('data-issuer') || '';
    const imgSrc = card.getAttribute('data-img') || '';
    const pdfSrc = card.getAttribute('data-pdf') || '';

    if (modalTitle) modalTitle.textContent = title;
    if (modalIssuer) modalIssuer.textContent = `Issued by: ${issuer}`;
    if (modalImg) modalImg.src = imgSrc;
    
    if (modalOpenBtn) {
      modalOpenBtn.onclick = () => window.open(imgSrc, '_blank');
    }

    if (modalPdfBtn) {
      if (pdfSrc) {
        modalPdfBtn.style.display = 'inline-flex';
        modalPdfBtn.onclick = () => window.open(pdfSrc, '_blank');
      } else {
        modalPdfBtn.style.display = 'none';
      }
    }

    certModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCertificateModal() {
    if (!certModal) return;
    certModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  certCards.forEach(card => {
    card.addEventListener('click', () => openCertificateModal(card));
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeCertificateModal);
  }

  if (certModal) {
    certModal.addEventListener('click', (e) => {
      if (e.target === certModal) {
        closeCertificateModal();
      }
    });
  }

  // Escape key listener for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && certModal && certModal.classList.contains('active')) {
      closeCertificateModal();
    }
  });

  // --- 7. Toast Notification Utility ---
  function showToast(message, icon = '✓') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="color: var(--primary);">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- 8. Copy to Clipboard Handlers ---
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const textToCopy = btn.getAttribute('data-copy');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          showToast(`Copied "${textToCopy}" to clipboard!`, '📋');
        }).catch(() => {
          showToast(`Failed to copy to clipboard`, '⚠️');
        });
      }
    });
  });

  // --- 9. Contact Message Form ---
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('senderName')?.value || '';
      const email = document.getElementById('senderEmail')?.value || '';
      const subject = document.getElementById('senderSubject')?.value || 'Portfolio Inquiry';
      const message = document.getElementById('senderMessage')?.value || '';

      const mailtoUrl = `mailto:sansuji2018@gmail.com?subject=${encodeURIComponent(`[Portfolio] ${subject} - from ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;

      window.location.href = mailtoUrl;
      showToast('Opening your email client to send message...', '✉️');
      contactForm.reset();
    });
  }
});
