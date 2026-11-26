// 原图字节仍在 media 中；仅为页面显示创建可复用的短地址，避免反复拼接百兆 HTML。
const seedreamImageCache = new Map();
function seedreamDisplayImage(item){
  const id=item?.assetId,m=media[id];
  if(!m?.data)return '';
  const cached=seedreamImageCache.get(id);
  if(cached?.source===m.data)return cached.url;
  if(cached)URL.revokeObjectURL(cached.url);
  if(!m.data.startsWith('data:image/'))return m.data;
  const comma=m.data.indexOf(','),header=m.data.slice(0,comma),binary=atob(m.data.slice(comma+1));
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:header.slice(5).split(';')[0]}));
  seedreamImageCache.set(id,{source:m.data,url});
  return url;
}
