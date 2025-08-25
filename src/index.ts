import { AsYouType, type CountryCode } from 'libphonenumber-js'; // FYI this lib helps add bonus sugar on top of the original ask - the challenge is fully solved without it.

// modules
import { greetUser } from '$utils/greet';

// types
import type { Country, UserLocation } from './types/index';

// reused vars
let pList: HTMLDivElement;
let pOptions: HTMLAnchorElement[];
let lastSelectedP: HTMLAnchorElement;
let selectedIdx: number, // for active
  preselectedIdx: number = -1; // for focus (CSS)

window.Webflow ||= [];
// assures DOM + Webflow are ready...
window.Webflow.push(async () => {
  const name = 'Ruairi ✌️';
  greetUser(name);

  /* 
    TASK:
		- clone country select option as template
		- FETCH countries API w counryCode, name, flag, phonePrefix...
		- format res response to arr objs
		- populate countries select options
		- get user location 
		- preselect expected country code/prefix
		- make sure selected prefix uses webflow's native CURRENT (+ populate hidden op w countryCode)
		- on select open, make sure selected country is visible + centered - $0.scrollIntoView() 
		- add ability to type in options dropdown (ABC)
		- add keyboard nav (up/down/space/tab)
		- add correct ARIA attrs 
		- fun style inject 
	*/

  let countries = await fetchCountries();
  countries = filterSortCountries(countries);
  populateDropdownOptions(countries);
  preselectCountryFromLocation(countries);
  initKeys();
  initAdditionalOptions();
  setupDropdownToggleWatcher();
  injectStyles();
  injectLiquidGlass();

  // eslint-disable-next-line no-console
  console.log(
    '%clet me know what you think 😉 \n~ spencercap',
    'background-color: #4d4d4d; font-family: Courier New; color: #73fda6; font-size: 2em; padding: 10px; border-radius: 8px;'
  );
});

async function fetchCountries() {
  const baseUrl = `https://restcountries.com/v3.1/all`;
  const fields = [
    'cca2', // 'alpha2Code',
    'idd', // 'callingCodes',
    'name',
    'flag', // newer (uses emojis)
    'flags',
  ];

  try {
    const res = await fetch(`${baseUrl}?fields=${fields.join(',')}`);
    const json: Promise<Country[]> = await res.json();
    console.debug('countries', json);
    return json;
  } catch (e) {
    throw new Error('Failed to fetch countries', { cause: e });
  }
}

function filterSortCountries(countries: Country[]): Country[] {
  // filter out countries that don't have an idd.root
  countries = countries.filter((c) => c.idd.root);
  // sort countries by name.common ABC
  return countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
}

function populateDropdownOptions(countries: Country[]) {
  console.debug('populateDropdownOptions');

  const pListWrap = document.querySelector('.prefix-dropdown_list-wrapper') as HTMLDivElement;
  // const pList = pListWrap.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  pList = pListWrap.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  const pOptionTemplate = pList.querySelector('.prefix-dropdown_item') as HTMLOptionElement;
  pOptionTemplate.remove(); // bye bye placeholder
  // console.debug('pList', pList);
  // console.debug('pOptionTemplate', pOptionTemplate);

  for (const c of countries) {
    const pOption = pOptionTemplate.cloneNode(true) as HTMLOptionElement;
    const pOptionTxt = pOption.querySelector('.prefix-dropdown_txt') as HTMLDivElement;
    const pOptionFlag = pOption.querySelector('.prefix-dropdown_flag') as HTMLImageElement;
    const pOptionFlagEmoji = pOption.querySelector('.prefix-dropdown_flag-emoji') as HTMLDivElement;

    pOptionFlagEmoji.innerText = c.flag;
    pOptionFlag.src = c.flags.svg || c.flags.png;
    pOptionFlag.alt = c.flags.alt || `Flag: ${c.name.common}`;
    pOptionFlagEmoji.textContent = c.flag;
    pOptionTxt.textContent = c.cca2;
    pOption.title = c.name.common; // quick n dirty tooltip
    const countryCode = c.idd.suffixes.length === 1 ? c.idd.root + c.idd.suffixes[0] : c.idd.root;
    pOption.setAttribute('aria-label', c.name.common);
    pOption.setAttribute('data-country-name', c.name.common);
    pOption.setAttribute('data-country-prefix', countryCode);

    pOption.addEventListener('click', () => {
      console.debug('pOption clicked', pOption);
      updateActiveCountry(c);
      // NOW can use $0.click() to select any (ex: w keyboard nav or programmatically anywhere)
    });

    pList.appendChild(pOption);
  }

  pOptions = Array.from<HTMLAnchorElement>(pList.querySelectorAll('.prefix-dropdown_item'));
}

function updateActiveCountry(c: Country) {
  console.debug('updateActiveCountry', c);

  const pDropdownToggle = document.querySelector('.prefix-dropdown_toggle') as HTMLDivElement;
  const pActiveFlag = pDropdownToggle.querySelector('.prefix-dropdown_flag') as HTMLImageElement;
  const pActiveTxt = pDropdownToggle.querySelector('.prefix-dropdown_txt') as HTMLDivElement;
  const pOptionFlagEmoji = pDropdownToggle.querySelector(
    '.prefix-dropdown_flag-emoji'
  ) as HTMLDivElement;

  pOptionFlagEmoji.innerText = c.flag;
  pActiveFlag.src = c.flags.svg || c.flags.png;
  pActiveFlag.alt = c.flags.alt || `Flag: ${c.name.common}`;
  const countryCode = c.idd.suffixes.length === 1 ? c.idd.root + c.idd.suffixes[0] : c.idd.root;
  pActiveTxt.textContent = countryCode;
  pDropdownToggle.title = c.name.common;
  pDropdownToggle.setAttribute('aria-label', c.name.common);
  pDropdownToggle.setAttribute('data-country-name', c.name.common);
  pDropdownToggle.setAttribute('data-country-prefix', countryCode);

  // set hidden field w country code
  const hiddenField = document.querySelector('input[name="countryCode"]') as HTMLInputElement;
  hiddenField.value = c.cca2;

  // QUICK SHIM FOR "native" SELECT...
  // update selected in options (aria + w--current)
  for (const pOption of pOptions) {
    pOption.classList.remove('w--current');
    pOption.setAttribute('aria-selected', 'false');
    if (pOption.getAttribute('data-country-prefix') === countryCode) {
      pOption.classList.add('w--current');
      pOption.setAttribute('aria-selected', 'true');
      selectedIdx = pOptions.indexOf(pOption);
    }
  }
  // TODO find out real native way to dispatch webflow select event.. like: $0.dispatchEvent(new Event('w-select', { bubbles: true, data: idx }))
  // possibly... $0.jQuery3510245795163373337072['.wDropdown'].selectedIdx = 1

  const opFormatNumber = document.querySelector('#opFormatNumber') as HTMLInputElement;
  if (opFormatNumber.checked) {
    const numberInput = document.querySelector('#phoneNumber') as HTMLInputElement;
    formatPhoneNumber(numberInput);
  }

  closeDropdown();
}

function closeDropdown() {
  const pDropdownComponent = document.querySelector('.prefix-dropdown_component') as HTMLDivElement;
  pDropdownComponent.dispatchEvent(new Event('w-close', { bubbles: true })); // webflow event trick (theres probably one for a simpler select also...)

  // per spec, focus prefix toggle after close:
  const pDropdownToggle = document.querySelector('.prefix-dropdown_toggle') as HTMLDivElement;
  pDropdownToggle.focus();
}

function injectStyles() {
  // some fun style like anim in/out of dropdown + rainbow btn focus
  const style = document.createElement('style');
  style.textContent = `
		.prefix-dropdown_list-wrapper { 
			display: initial;
			visibility: hidden;
			opacity: 0;
			transform: translateY(16px);
			transition: display 0.2s, opacity 0.2s, visibility 0.2s, transform 0.2s;
		}

		.prefix-dropdown_list-wrapper.w-dropdown-list.w--open {
			visibility: visible;
			opacity: 1;
			transform: translateY(0px);
		}

		#btn-submit:focus {
			animation: rainbowFade 2s linear infinite alternate;
		}
		@keyframes rainbowFade {
			0% 	{ background-color: hsl(0,   50%, 75%); }  
			20% { background-color: hsl(60,  50%, 75%); }
			40% { background-color: hsl(120, 50%, 75%); }   
			60% { background-color: hsl(180, 50%, 75%); } 
			80% { background-color: hsl(240, 50%, 75%); }  
			100%{ background-color: hsl(300, 50%, 75%); }
		}
	`;
  style.id = 'prefix-dropdown-styles_sc';
  document.head.appendChild(style);
}

async function getUserLocation(): Promise<UserLocation> {
  // get user location (> navigator.geolocation)
  try {
    const res = await fetch('https://ipapi.co/json/');
    const json = await res.json();
    // console.debug('getUserLocation json', json);
    return json;
  } catch (e) {
    throw new Error('Failed to fetch user location', { cause: e });
  }
}

async function preselectCountryFromLocation(countries: Country[]) {
  const userLocation = await getUserLocation();
  console.debug('userLocation', userLocation);

  // preselect expected country from location
  const expectedCountry = countries.find((c) => c.cca2 === userLocation.country);
  if (expectedCountry) {
    updateActiveCountry(expectedCountry);
  }
}

function initKeys() {
  console.debug('initKeys');

  pList.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      console.debug('ArrowDown');
      e.preventDefault();

      preselectedIdx = (preselectedIdx + 1) % pOptions.length;
      pOptions[preselectedIdx].focus();
    } else if (e.key === 'ArrowUp') {
      console.debug('ArrowUp');
      e.preventDefault();

      preselectedIdx = preselectedIdx - 1;
      if (preselectedIdx === -1) {
        preselectedIdx = pOptions.length - 1;
      }
      pOptions[preselectedIdx].focus();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      // regex for letter keys
      const letter = e.key.toLowerCase();
      console.debug('LetterDown:', letter);

      //find first country option that starts with this letter
      const matchingIndex = pOptions.findIndex((c) => {
        const text = c.getAttribute('data-country-name')?.toLowerCase() || '';
        return text.startsWith(letter);
      });

      if (matchingIndex !== -1) {
        preselectedIdx = matchingIndex;
        pOptions[preselectedIdx].focus();
      }
    }
  });
}

// native JS watcher for w--open (verbose but works)
function setupDropdownToggleWatcher() {
  const dropdownToggle = document.querySelector('.prefix-dropdown_toggle') as HTMLElement;

  if (!dropdownToggle) {
    console.warn('.prefix-dropdown_toggle element not found');
    return;
  }

  // Create a MutationObserver to watch for class changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target as HTMLElement;
        if (target.classList.contains('w--open')) {
          // Hook: Run function when w--open class is added
          onDropdownOpen();
        } else {
          onDropdownClosed();
        }
      }
    });
  });

  // Start observing the dropdown toggle element
  observer.observe(dropdownToggle, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

function onDropdownOpen() {
  console.debug('Dropdown OPEN');

  lastSelectedP = pList.querySelector('.w--current') as HTMLAnchorElement;
  selectedIdx = pOptions.indexOf(lastSelectedP);
  preselectedIdx = selectedIdx;

  setTimeout(() => {
    // .focus automatically scrolls the option to be visible
    lastSelectedP?.focus();
  }, 100); // needs a couple ticks to focus right... (barely noticeable)
}

function onDropdownClosed() {
  console.debug('Dropdown CLOSED');
}

function initAdditionalOptions() {
  console.debug('initAdditionalOptions');

  // flags
  const imgFlags = document.querySelectorAll('.prefix-dropdown_flag');
  const emojiFlags = document.querySelectorAll('.prefix-dropdown_flag-emoji');
  const opEmojiFlags = document.querySelector('#opEmojiFlags') as HTMLInputElement;
  opEmojiFlags.addEventListener('change', () => {
    if (opEmojiFlags.checked) {
      imgFlags.forEach((flag) => flag.classList.add('hidden'));
      emojiFlags.forEach((flag) => flag.classList.remove('hidden'));
    } else {
      imgFlags.forEach((flag) => flag.classList.remove('hidden'));
      emojiFlags.forEach((flag) => flag.classList.add('hidden'));
    }
  });

  // number formatting
  const opFormatNumber = document.querySelector('#opFormatNumber') as HTMLInputElement;
  const numberInput = document.querySelector('#phoneNumber') as HTMLInputElement;
  // when its toggled, format any pre-existing input number
  opFormatNumber.addEventListener('change', () => {
    if (opFormatNumber.checked) {
      formatPhoneNumber(numberInput);
    }
  });
  // also format on typing
  numberInput.addEventListener('input', () => {
    if (opFormatNumber.checked) {
      formatPhoneNumber(numberInput);
    }
  });

  // shim to fix not being able to backspace over inserted parens or dashes
  numberInput.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
      const cursorPos = numberInput.selectionStart!;
      const nIn = numberInput.value;

      // regex for: ( ) - \
      if (/[()\-\s]/.test(nIn[cursorPos - 1])) {
        e.preventDefault();

        // Remove that symbol manually
        numberInput.value = nIn.slice(0, cursorPos - 1) + nIn.slice(cursorPos);
      }
    }
  });

  // liquid glass
  const opLiquidGlass = document.querySelector('#opGlassy') as HTMLInputElement;
  opLiquidGlass.addEventListener('change', () => {
    if (opLiquidGlass.checked) {
      enableLiquidGlass(true);
    } else {
      enableLiquidGlass(false);
    }
  });
}

function formatPhoneNumber(nInput: HTMLInputElement) {
  const nIn = nInput.value;
  const ccEl = document.querySelector('input[name="countryCode"]') as HTMLInputElement;
  const countryCode = ccEl.value as CountryCode | null; // set from cca2
  if (!countryCode) {
    console.warn('No country code found to format number by');
    return;
  }

  // create a NEW instance because there is no .setCountry method
  const formatter = new AsYouType(countryCode);
  const nOut = formatter.input(nIn);
  console.debug('nOut', nOut);
  nInput.value = nOut;
}

function injectLiquidGlass() {
  const style = document.createElement('style');
  style.textContent = `
    .liquid-glass-wrapper {
      position: relative;
      display: flex;
      font-weight: 600;
      border-radius: 30px;
      color: #fff;
      box-shadow: 0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 2.2);
    }
    .liquid-glass-wrapper .phone-form_form,
    .liquid-glass-wrapper .w-input {
      background: transparent;
      border-color: transparent;
    }
    .liquid-glass-wrapper #btn-submit {
      background-color: #ffffff94;
      color: #4d4d4d;
      /* border: 2px solid #4d4d4d; */
      border-radius: 30px;
    }
    .liquid-glass-wrapper .prefix-dropdown_list {
      background: transparent;
      position: relative;
      border-radius: 30px;
      z-index: 3;
    }
    .liquid-glass-wrapper #phoneNumber::placeholder {
      color: #0003;
    }
    .liquid-glass-effect {
      position: absolute;
      z-index: 0;
      inset: 0;
      border-radius: 30px;
      backdrop-filter: blur(3px);
      filter: url('#glass-distortion');
      overflow: hidden;
      isolation: isolate;
      pointer-events: none;
    }
    .liquid-glass-tint {
      z-index: 1;
      position: absolute;
      inset: 0;
      border-radius: 30px;
      background: rgba(255, 255, 255, 0.25);
      pointer-events: none;
    }
    .liquid-glass-shine {
      position: absolute;
      inset: 0;
      z-index: 2;
      border-radius: 30px;
      overflow: hidden;
      box-shadow: inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
        inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5);
      pointer-events: none;
    }
  `;
  style.id = 'liquid-glass-styles_sc';
  document.head.appendChild(style);
  // FYI svg code w filter is inserted on webflow side

  initMouseMove();
}

function enableLiquidGlass(willEnable: boolean) {
  const form = document.querySelector('.phone-form_component') as HTMLFormElement;
  const liquidGlassEffect = form.querySelector('.liquid-glass-effect') as HTMLDivElement;
  const liquidGlassTint = form.querySelector('.liquid-glass-tint') as HTMLDivElement;
  const liquidGlassShine = form.querySelector('.liquid-glass-shine') as HTMLDivElement;

  if (willEnable) {
    document.body.classList.add('body-coloured');
    form.classList.add('liquid-glass-wrapper');
    liquidGlassEffect.style.display = 'block';
    liquidGlassTint.style.display = 'block';
    liquidGlassShine.style.display = 'block';
    window.liquidGlassEnabled = true; // not the best practice to extend window but theres no state mgmt for this simple code challenge
  } else {
    document.body.classList.remove('body-coloured');
    form.classList.remove('liquid-glass-wrapper');
    liquidGlassEffect.style.display = 'none';
    liquidGlassTint.style.display = 'none';
    liquidGlassShine.style.display = 'none';
    window.liquidGlassEnabled = false;
  }
}

function initMouseMove() {
  document.addEventListener('mousemove', (e) => {
    if (!window.liquidGlassEnabled) return;
    const scale = 0.1;
    document.body.style.backgroundPosition = `${e.clientX * scale}px ${e.clientY * scale}px`;
  });
}
