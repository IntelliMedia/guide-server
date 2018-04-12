Array.prototype.includesAny = function(array2) 
{
  return this.some(r=> array2.indexOf(r) >= 0);
}