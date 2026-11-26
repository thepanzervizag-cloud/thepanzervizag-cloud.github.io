export const popular = [
  ['IN','Hyderabad'], ['IN','Bangalore','Bengaluru'], ['IN','Vizag','Visakhapatnam','Vishakhapatnam'],
  ['IN','Pune','Poona'], ['IN','Vijayawada','Bezawada']
];

export function normalize(text) {
  return text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[\s.’'-]+/g,'');
}

export function entry([country,name,...aliases]) {
  return {country,name,keys:[...new Set([name,...aliases].map(normalize))]};
}

// Allow one insertion, deletion, substitution or adjacent transposition.
function near(a,b) {
  if (Math.abs(a.length-b.length)>1) return false;
  let i=0;
  while(i<a.length && a[i]===b[i]) i++;
  if(a.length<b.length) return a.slice(i)===b.slice(i+1);
  if(a.length>b.length) return a.slice(i+1)===b.slice(i);
  return a.slice(i+1)===b.slice(i+1) ||
    (a[i]===b[i+1] && a[i+1]===b[i] && a.slice(i+2)===b.slice(i+2));
}

export const starters=popular.map(entry);
export function matches(query,cities=[]) {
  const key=normalize(query.trim());
  if(!key) return starters.slice(0,4);
  const buckets=[[],[],[]];
  const seen=new Set();
  function inspect(city) {
    let rank=3;
    for(const alias of city.keys) {
      if(alias===key){rank=0;break;}
      if(alias.startsWith(key)) rank=1;
      else if(rank>2 && key.length>=4 && near(key,alias)) rank=2;
    }
    if(rank===3 || buckets[rank].length>=8) return;
    const identity=city.country+'|'+city.name;
    if(seen.has(identity)) return;
    seen.add(identity);
    buckets[rank].push(city);
  }
  // Keep featured destinations prominent for short prefixes such as “Vi”.
  starters.forEach(inspect);
  const featured=key.length<=2?buckets[1].splice(0):[];
  cities.forEach(inspect);
  return [...featured,...buckets.flat()].slice(0,8);
}

export function submittedCity(text) {
  const key=normalize(text.trim());
  if(key.length<4) return text;
  const vizag=starters.find(city=>city.name==='Vizag');
  return vizag.keys.some(alias=>key===alias || near(key,alias))?'Vizag':text;
}
