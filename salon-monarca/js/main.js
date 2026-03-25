// Mobile navigation toggle
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const siteShell = document.querySelector('.site-shell');
const scrollProgress = document.querySelector('.scroll-progress');
const trackedSections = Array.from(document.querySelectorAll('section[id], footer[id]'));
const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!expanded));
    mobileMenu.classList.toggle('hidden');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.add('hidden');
    });
  });
}

const setActiveNavLink = (targetId) => {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${targetId}`;
    link.classList.toggle('nav-link-active', isActive);
  });
};

const updateScrollUI = () => {
  const scrollTop = window.scrollY || window.pageYOffset;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

  siteShell?.classList.toggle('is-scrolled', scrollTop > 24);
  document.documentElement.style.setProperty('--scroll-progress', progress.toString());

  if (scrollProgress) {
    scrollProgress.style.opacity = progress > 0.01 ? '1' : '0';
  }
};

let scrollFrame = 0;
const requestScrollUI = () => {
  if (scrollFrame) {
    return;
  }

  scrollFrame = window.requestAnimationFrame(() => {
    updateScrollUI();
    scrollFrame = 0;
  });
};

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const nextId = link.getAttribute('href')?.replace('#', '');

    if (nextId) {
      setActiveNavLink(nextId);
    }
  });
});

window.addEventListener('scroll', requestScrollUI, { passive: true });
window.addEventListener('resize', requestScrollUI);
updateScrollUI();

if ('IntersectionObserver' in window && trackedSections.length > 0) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio);

      if (visibleEntries[0]?.target?.id) {
        setActiveNavLink(visibleEntries[0].target.id);
      }
    },
    {
      threshold: [0.2, 0.45, 0.65],
      rootMargin: '-18% 0px -45% 0px'
    }
  );

  trackedSections.forEach((section) => sectionObserver.observe(section));
}

// Contact modal and reservation form
const contactModal = document.getElementById('contact-modal');
const contactForm = document.getElementById('contact-form');
const packageInterestInput = document.getElementById('package-interest');
const contactFeedback = document.getElementById('contact-feedback');
const contactFeedbackSummary = document.getElementById('contact-feedback-summary');
const contactMailtoLink = document.getElementById('contact-mailto-link');
const contactNameInput = document.getElementById('contact-name');
const contactPackageBadge = document.getElementById('contact-package-badge');
const contactMessageInput = document.getElementById('contact-message');
const contactMessageCount = document.getElementById('contact-message-count');
const contactOpeners = document.querySelectorAll('[data-open-contact]');
const contactClosers = document.querySelectorAll('[data-close-contact]');
const contactSubmitButton = contactForm?.querySelector('.contact-submit-button');
const contactSubmitLabel = contactSubmitButton?.querySelector('[data-submit-label]');
const contactFields = Array.from(contactForm?.querySelectorAll('.contact-field') || []);
const defaultSubmitLabel = contactSubmitLabel?.textContent || 'Enviar solicitud';
const defaultFeedbackSummary = contactFeedbackSummary?.textContent || '';
let previousFocus = null;
let modalCloseTimer = 0;

const fieldMessages = {
  'contact-name': {
    successMessage: 'Nombre listo para el seguimiento.',
    errors: {
      valueMissing: 'Necesitamos un nombre para preparar la solicitud.'
    }
  },
  'contact-phone': {
    successMessage: 'Teléfono listo para contacto.',
    errors: {
      valueMissing: 'Comparte un teléfono para contactarte.'
    }
  },
  'contact-email': {
    successMessage: 'Correo listo para enviarte seguimiento.',
    errors: {
      valueMissing: 'Necesitamos un correo electrónico.',
      typeMismatch: 'Escribe un correo válido, por ejemplo correo@ejemplo.com.'
    }
  },
  'contact-event': {
    successMessage: 'Tipo de evento registrado.',
    errors: {
      valueMissing: 'Selecciona el tipo de evento.'
    }
  },
  'contact-date': {
    successMessage: 'Fecha agregada al borrador.',
    errors: {
      valueMissing: 'Indica una fecha estimada para el evento.'
    }
  },
  'contact-guests': {
    successMessage: 'Cantidad de invitados registrada.',
    errors: {
      valueMissing: 'Comparte el número aproximado de invitados.',
      rangeUnderflow: 'La estimación mínima es de 20 invitados.'
    }
  },
  'contact-message': {
    successMessage: 'Detalles añadidos al resumen.',
    errors: {
      valueMissing: 'Cuéntanos al menos los detalles básicos del evento.'
    }
  }
};

const formatEventDate = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(parsedDate);
};

const updatePackageBadge = (packageName = '') => {
  if (!contactPackageBadge) {
    return;
  }

  if (packageName) {
    contactPackageBadge.textContent = packageName;
    contactPackageBadge.classList.remove('hidden');
    return;
  }

  contactPackageBadge.textContent = '';
  contactPackageBadge.classList.add('hidden');
};

const updateMessageCounter = () => {
  if (!contactMessageInput || !contactMessageCount) {
    return;
  }

  const maxLength = Number(contactMessageInput.getAttribute('maxlength')) || 600;
  contactMessageCount.textContent = `${contactMessageInput.value.length} / ${maxLength}`;
};

const setFieldState = (field, state, message) => {
  const group = field.closest('.contact-field-group');
  const helper = group?.querySelector(`[data-feedback-for="${field.id}"]`);

  group?.classList.remove('is-valid', 'is-invalid');
  field.classList.remove('is-valid', 'is-invalid');

  if (state === 'valid') {
    group?.classList.add('is-valid');
    field.classList.add('is-valid');
  }

  if (state === 'invalid') {
    group?.classList.add('is-invalid');
    field.classList.add('is-invalid');
  }

  if (helper && message) {
    helper.textContent = message;
  }
};

const getFieldMessage = (field, showErrors = false) => {
  const config = fieldMessages[field.id] || {};
  const group = field.closest('.contact-field-group');
  const helper = group?.querySelector(`[data-feedback-for="${field.id}"]`);
  const defaultMessage = helper?.dataset.defaultMessage || helper?.textContent || '';
  const rawValue = typeof field.value === 'string' ? field.value : String(field.value || '');
  const hasValue = rawValue.trim().length > 0;

  if (!hasValue) {
    if (showErrors && field.validity.valueMissing) {
      return {
        state: 'invalid',
        message: config.errors?.valueMissing || 'Este campo es obligatorio.'
      };
    }

    return {
      state: 'default',
      message: defaultMessage
    };
  }

  if (!field.validity.valid) {
    if (field.validity.typeMismatch) {
      return {
        state: 'invalid',
        message: config.errors?.typeMismatch || 'Revisa el formato de este campo.'
      };
    }

    if (field.validity.rangeUnderflow) {
      return {
        state: 'invalid',
        message: config.errors?.rangeUnderflow || 'El valor es menor al mínimo permitido.'
      };
    }

    return {
      state: 'invalid',
      message: config.errors?.generic || 'Revisa la información de este campo.'
    };
  }

  return {
    state: 'valid',
    message: config.successMessage || defaultMessage
  };
};

const refreshFieldState = (field, showErrors = false) => {
  const nextState = getFieldMessage(field, showErrors);
  setFieldState(field, nextState.state, nextState.message);
};

const resetFormFeedbackUI = () => {
  if (contactFeedback) {
    contactFeedback.classList.add('hidden');
  }

  if (contactFeedbackSummary) {
    contactFeedbackSummary.textContent = defaultFeedbackSummary;
  }

  if (contactSubmitButton) {
    contactSubmitButton.classList.remove('is-busy');
  }

  if (contactSubmitLabel) {
    contactSubmitLabel.textContent = defaultSubmitLabel;
  }
};

contactFields.forEach((field) => {
  const group = field.closest('.contact-field-group');
  const helper = group?.querySelector(`[data-feedback-for="${field.id}"]`);

  if (helper && !helper.dataset.defaultMessage) {
    helper.dataset.defaultMessage = helper.textContent;
  }

  ['input', 'change', 'blur'].forEach((eventName) => {
    field.addEventListener(eventName, () => {
      refreshFieldState(field, true);
      updateMessageCounter();
    });
  });
});

updateMessageCounter();

const openContactModal = (packageName = '') => {
  if (!contactModal) {
    return;
  }

  window.clearTimeout(modalCloseTimer);
  previousFocus = document.activeElement;
  packageInterestInput.value = packageName;
  updatePackageBadge(packageName);
  contactModal.classList.remove('hidden');
  contactModal.classList.add('flex');
  contactModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');
  resetFormFeedbackUI();

  window.setTimeout(() => {
    contactNameInput?.focus();
  }, 120);

  window.requestAnimationFrame(() => {
    contactModal.classList.add('is-open');
  });
};

const closeContactModal = () => {
  if (!contactModal || contactModal.classList.contains('hidden')) {
    return;
  }

  window.clearTimeout(modalCloseTimer);
  contactModal.classList.remove('is-open');

  modalCloseTimer = window.setTimeout(() => {
    contactModal.classList.add('hidden');
    contactModal.classList.remove('flex');
    contactModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');
    previousFocus?.focus?.();
  }, 260);
};

contactOpeners.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    openContactModal(trigger.dataset.package || '');
  });
});

contactClosers.forEach((trigger) => {
  trigger.addEventListener('click', closeContactModal);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && contactModal && !contactModal.classList.contains('hidden')) {
    closeContactModal();
  }
});

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    let firstInvalidField = null;

    contactFields.forEach((field) => {
      refreshFieldState(field, true);

      if (!firstInvalidField && !field.checkValidity()) {
        firstInvalidField = field;
      }
    });

    if (firstInvalidField) {
      firstInvalidField.focus();
      return;
    }

    if (contactSubmitButton) {
      contactSubmitButton.classList.add('is-busy');
    }

    if (contactSubmitLabel) {
      contactSubmitLabel.textContent = 'Preparando correo...';
    }

    const formData = new FormData(contactForm);
    const packageInterest = formData.get('packageInterest');
    const eventType = formData.get('eventType');
    const formattedEventDate = formatEventDate(String(formData.get('eventDate') || ''));
    const subject = `Reserva Salón Monarca - ${eventType || 'Consulta general'}`;
    const bodyLines = [
      'Nueva solicitud de reserva para Salón Monarca',
      '',
      `Nombre: ${formData.get('name')}`,
      `Teléfono: ${formData.get('phone')}`,
      `Correo: ${formData.get('email')}`,
      `Tipo de evento: ${eventType}`,
      `Fecha estimada: ${formattedEventDate || formData.get('eventDate')}`,
      `Invitados: ${formData.get('guests')}`,
      packageInterest ? `Paquete de interés: ${packageInterest}` : null,
      '',
      'Detalles:',
      String(formData.get('message') || '')
    ].filter(Boolean);

    const mailtoHref = `mailto:salonesmonarca@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

    const leads = JSON.parse(window.localStorage.getItem('salonMonarcaLeads') || '[]');
    leads.push({
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      eventType,
      eventDate: formData.get('eventDate'),
      guests: formData.get('guests'),
      packageInterest,
      message: formData.get('message'),
      createdAt: new Date().toISOString()
    });
    window.localStorage.setItem('salonMonarcaLeads', JSON.stringify(leads));

    if (contactMailtoLink) {
      contactMailtoLink.href = mailtoHref;
    }

    if (contactFeedbackSummary) {
      const summaryParts = [
        eventType ? `tipo ${String(eventType).toLowerCase()}` : null,
        packageInterest ? String(packageInterest).toLowerCase() : null,
        formattedEventDate ? `fecha ${formattedEventDate}` : null
      ].filter(Boolean);

      contactFeedbackSummary.textContent = summaryParts.length
        ? `Abrimos tu correo con ${summaryParts.join(', ')} y todos los detalles ya preparados.`
        : defaultFeedbackSummary;
    }

    if (contactFeedback) {
      contactFeedback.classList.remove('hidden');
    }

    contactForm.reset();
    packageInterestInput.value = '';
    updatePackageBadge('');
    contactFields.forEach((field) => refreshFieldState(field, false));
    updateMessageCounter();

    window.setTimeout(() => {
      window.location.href = mailtoHref;
    }, 120);

    window.setTimeout(() => {
      if (contactSubmitButton) {
        contactSubmitButton.classList.remove('is-busy');
      }

      if (contactSubmitLabel) {
        contactSubmitLabel.textContent = defaultSubmitLabel;
      }
    }, 1200);
  });
}

// Generic slider behavior
const sliderRoots = document.querySelectorAll('[data-slider]');

sliderRoots.forEach((sliderRoot) => {
  const track = sliderRoot.querySelector('.slider-track');
  const slides = Array.from(track?.children || []);
  const prevButton = sliderRoot.querySelector('[data-slider-prev]');
  const nextButton = sliderRoot.querySelector('[data-slider-next]');
  let index = 0;
  let autoplayTimer = 0;
  let isPaused = false;

  if (!track || slides.length === 0) {
    return;
  }

  const render = () => {
    track.style.transform = `translateX(-${index * 100}%)`;
  };

  prevButton?.addEventListener('click', () => {
    index = (index - 1 + slides.length) % slides.length;
    render();
  });

  nextButton?.addEventListener('click', () => {
    index = (index + 1) % slides.length;
    render();
  });

  const setPaused = (nextPausedState) => {
    isPaused = nextPausedState;
    sliderRoot.classList.toggle('is-paused', isPaused);
  };

  const startAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = window.setInterval(() => {
      if (isPaused) {
        return;
      }

      index = (index + 1) % slides.length;
      render();
    }, 5500);
  };

  sliderRoot.addEventListener('mouseenter', () => setPaused(true));
  sliderRoot.addEventListener('mouseleave', () => setPaused(false));
  sliderRoot.addEventListener('focusin', () => setPaused(true));
  sliderRoot.addEventListener('focusout', () => {
    window.setTimeout(() => {
      setPaused(sliderRoot.contains(document.activeElement));
    }, 0);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setPaused(true);
      return;
    }

    setPaused(sliderRoot.contains(document.activeElement));
  });

  startAutoplay();
});

// Fade-in on scroll
const revealElements = document.querySelectorAll('.fade-section');

revealElements.forEach((section) => {
  section.querySelectorAll('[data-flow]').forEach((item, index) => {
    item.style.setProperty('--flow-delay', `${Math.min(index * 90, 360)}ms`);
  });
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px'
    }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add('is-visible'));
}
