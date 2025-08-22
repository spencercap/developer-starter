// modules
import { greetUser } from '$utils/greet';

// types
import type { Country } from './types/index';

window.Webflow ||= [];
// assures DOM + Webflow are ready...
window.Webflow.push(async () => {
  const name = 'Ruairi ✌️';
  greetUser(name);

  /* 
		- clone country select option as template
		- FETCH countries API w counryCode, name, flag, phonePrefix...
		- format 
		- populate countries select
		- get user location 
		- preselect expected country code/prefix
		- make sure selected prefix uses webflow's native CURRENT (+ populate hidden op w countryCode)
		- on select open, make sure selected country is visible + centered 
		- add ability to type in options dropdown (ABC)
		- add keyboard nav (up/down/space/tab)
		- add correct ARIA attrs 
		- fun style inject 
	*/

  let countries = await fetchCountries();
  console.log('countries', countries);

  countries = filterSortCountries(countries);

  populateDropdownOptions(countries);

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

function populateDropdownOptions(countries: Country[]) {
  console.log('populateDropdownOptions');

  const pListWrap = document.querySelector('.prefix-dropdown_list-wrapper') as HTMLDivElement;
  const pList = pListWrap.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  const pOptionTemplate = pList.querySelector('.prefix-dropdown_item') as HTMLOptionElement;
  pOptionTemplate.remove(); // bye bye placeholder
  // console.log('pList', pList);
  // console.log('pOptionTemplate', pOptionTemplate);

  for (const c of countries) {
    const pOption = pOptionTemplate.cloneNode(true) as HTMLOptionElement;
    const pOptionTxt = pOption.querySelector('.prefix-dropdown_txt') as HTMLDivElement;
    const pOptionFlag = pOption.querySelector('.prefix-dropdown_flag') as HTMLImageElement;
    // TODO make emoji flag toggle option
    pOptionFlag.src = c.flags.svg || c.flags.png;
    pOptionFlag.alt = c.flags.alt || `Flag: ${c.name.common}`;
    pOptionTxt.textContent = c.cca2;
    pOption.title = c.name.common; // quick n dirty tooltip
    pOption.setAttribute('aria-label', c.name.common);
    pOption.setAttribute('data-country-name', c.name.common);
    pOption.setAttribute('data-country-prefix', c.idd.root + c.idd.suffixes[0]);

    pOption.addEventListener('click', () => {
      console.log('pOption clicked', pOption);
      updateActiveCountry(c);
    });

    pList.appendChild(pOption);
  }
}

function updateActiveCountry(c: Country) {
  console.log('updateActiveCountry', c);

  const pDropdownToggle = document.querySelector('.prefix-dropdown_toggle') as HTMLDivElement;
  const pActiveFlag = pDropdownToggle.querySelector('.prefix-dropdown_flag') as HTMLImageElement;
  const pActiveTxt = pDropdownToggle.querySelector('.prefix-dropdown_txt') as HTMLDivElement;
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

  // QUICK N DIRTY SHIM FOR SELECT...
  // update selected in options (aria + w--current)
  const pList = document.querySelector('.prefix-dropdown_list') as HTMLDivElement;
  const pOptions = pList.querySelectorAll('.prefix-dropdown_item') as NodeListOf<HTMLOptionElement>;
  for (const pOption of pOptions) {
    pOption.classList.remove('w--current');
    pOption.setAttribute('aria-selected', 'false');
    if (pOption.getAttribute('data-country-prefix') === prefixTxt) {
      pOption.classList.add('w--current');
      pOption.setAttribute('aria-selected', 'true');
    }
  }
  // TODO update w: $0.jQuery3510245795163373337072['.wDropdown'].selectedIdx = 1

  closeDropdown();
}

function closeDropdown() {
  const pDropdownComponent = document.querySelector('.prefix-dropdown_component') as HTMLDivElement;
  pDropdownComponent.dispatchEvent(new Event('w-close', { bubbles: true }));
}

function injectStyles() {
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
	`;
  style.id = 'sc-prefix-dropdown-styles';
  document.head.appendChild(style);
}
