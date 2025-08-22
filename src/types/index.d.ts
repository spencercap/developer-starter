export type Country = {
  cca2: string; // 2 dig code
  idd: {
    root: string;
    suffixes: string[];
  };
  name: {
    common: string;
    official: string;
    nativeName: {
      [key: string]: {
        official: string;
        common: string;
      };
    };
  };
  flag: string;
  flags: {
    png: string;
    svg: string;
    alt: string;
  };
};
