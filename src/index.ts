// modules
import { greetUser } from '$utils/greet';

// types
import type { Country, UserLocation } from './types/index';

window.Webflow ||= [];
// assures DOM + Webflow are ready...
window.Webflow.push(async () => {
  const name = 'Ruairi ✌️';
  greetUser(name);

  /* 
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
  console.debug('countries', countries);

  countries = filterSortCountries(countries);

  populateDropdownOptions(countries);

  preselectCountryFromLocation(countries);

  initKeys();

  initAdditionalOptions();

  setupDropdownToggleWatcher();

  injectStyles();

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

let pList: HTMLDivElement;
let pOptions: HTMLAnchorElement[];
let lastSelectedP: HTMLAnchorElement;
let selectedIdx: number, // for active
  preselectedIdx: number = -1; // for focus (CSS)

function populateDropdownOptions(countries: Country[]) {
  console.debug('populateDropdownOptions');

  const pListWrap = document.querySelector('.prefix-dropdown_list-wrapper') as HTMLDivElement;
  // const pList = pListWrap.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  pList = pListWrap.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  const pOptionTemplate = pList.querySelector('.prefix-dropdown_item') as HTMLOptionElement;
  pOptionTemplate.remove(); // bye bye placeholder
  // console.log('pList', pList);
  // console.log('pOptionTemplate', pOptionTemplate);

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
    pOption.setAttribute('aria-label', c.name.common);
    pOption.setAttribute('data-country-name', c.name.common);
    pOption.setAttribute('data-country-prefix', c.idd.root + c.idd.suffixes[0]);

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
  const prefixTxt = c.idd.root + c.idd.suffixes[0];
  pActiveTxt.textContent = prefixTxt;
  pDropdownToggle.title = c.name.common;
  pDropdownToggle.setAttribute('aria-label', c.name.common);
  pDropdownToggle.setAttribute('data-country-name', c.name.common);
  pDropdownToggle.setAttribute('data-country-prefix', c.idd.root + c.idd.suffixes[0]);

  // set hidden field w country code
  const hiddenField = document.querySelector('input[name="countryCode"]') as HTMLInputElement;
  hiddenField.value = c.cca2;

  // QUICK SHIM FOR "native" SELECT...
  // update selected in options (aria + w--current)
  // const pList = document.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  // const pOptions = pList.querySelectorAll('.prefix-dropdown_item') as NodeListOf<HTMLOptionElement>;
  for (const pOption of pOptions) {
    pOption.classList.remove('w--current');
    pOption.setAttribute('aria-selected', 'false');
    if (pOption.getAttribute('data-country-prefix') === prefixTxt) {
      pOption.classList.add('w--current');
      pOption.setAttribute('aria-selected', 'true');
      selectedIdx = pOptions.indexOf(pOption);
    }
  }
  // TODO find out real native way to dispatch webflow select event.. like: $0.dispatchEvent(new Event('w-select', { bubbles: true, data: idx }))
  // TODO update to: $0.jQuery3510245795163373337072['.wDropdown'].selectedIdx = 1

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
			0% 	{ background-color: hsl(0,   100%, 35%); }  
			20% { background-color: hsl(60,  100%, 35%); }
			40% { background-color: hsl(120, 100%, 35%); }   
			60% { background-color: hsl(180, 100%, 35%); } 
			80% { background-color: hsl(240, 100%, 35%); }  
			100%{ background-color: hsl(300, 100%, 35%); }
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

  // remove
}

function initAdditionalOptions() {
  console.debug('initAdditionalOptions');

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
}
