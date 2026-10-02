/* Analizador de expresiones aritméticas del laboratorio. */
const CuantitativasFormulas = (() => {
  const functions = {
    ABS: [1, Math.abs], RAIZ: [1, Math.sqrt], SQRT: [1, Math.sqrt],
    LN: [1, Math.log], LOG: [1, Math.log10], EXP: [1, Math.exp],
    SENO: [1, Math.sin], SEN: [1, Math.sin], SIN: [1, Math.sin], COS: [1, Math.cos],
    POTENCIA: [2, Math.pow], POW: [2, Math.pow],
    MIN: [null, Math.min], MAX: [null, Math.max],
    SUMA: [null, (...a) => a.reduce((x,y) => x+y,0)],
    PROMEDIO: [null, (...a) => a.reduce((x,y) => x+y,0)/a.length]
  };
  function compile(source) {
    const text = String(source).trim().replace(/^=/,'').toUpperCase();
    if (!text) throw Error('Escribe una fórmula, por ejemplo =2*X+5.');
    if (text.length > 300) throw Error('Usa una fórmula de hasta 300 caracteres.');
    let pos=0, token, depth=0;
    function next() {
      while (/\s/.test(text[pos] || '') && pos<text.length) pos++;
      if(pos>=text.length) return token={type:'end'};
      const s=text.slice(pos),number=s.match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:E[+-]?\d+)?/);
      if(number){pos+=number[0].length;return token={type:'number',value:Number(number[0].replace(',','.'))};}
      const name=s.match(/^[A-Z][A-Z0-9_]*/);
      if(name){pos+=name[0].length;return token={type:'name',value:name[0]};}
      if('+-*/^();'.includes(s[0])){pos++;return token={type:s[0]};}
      throw Error(`Símbolo «${s[0]}» no admitido. Usa + − * / ^ y paréntesis.`);
    }
    function take(t){if(token.type!==t)throw Error(`Falta «${t}» o hay un argumento incompleto.`);next();}
    function atom(){
      if(++depth>30)throw Error('Reduce la cantidad de paréntesis anidados.');
      let node;
      if(token.type==='number'){node={number:token.value};next();}
      else if(token.type==='('){next();node=expression();take(')');}
      else if(token.type==='name'){
        let name=token.value;next();
        if(token.type==='('){
          if(!Object.hasOwn(functions,name))throw Error(`Función ${name} no disponible. Consulta la ayuda de fórmulas.`);
          next();let args=[expression()];while(token.type===';'){next();args.push(expression());}take(')');
          if(functions[name][0]!==null&&args.length!==functions[name][0])throw Error(`${name} necesita ${functions[name][0]} argumento(s). Separa argumentos con ;.`);
          node={name,args};
        }else node={variable:name};
      }else throw Error('La fórmula está incompleta. Revisa números, operadores y paréntesis.');
      depth--;return node;
    }
    function power(){let left=atom();if(token.type==='^'){next();return {op:'^',left,right:unary()};}return left;}
    function unary(){if(token.type==='+'||token.type==='-'){const op=token.type;next();if(++depth>30)throw Error('La fórmula tiene demasiados operadores seguidos.');const right=unary();depth--;return {op:'neg',sign:op==='-'?-1:1,right};}return power();}
    function term(){let left=unary();while(token.type==='*'||token.type==='/'){const op=token.type;next();left={op,left,right:unary()};}return left;}
    function expression(){let left=term();while(token.type==='+'||token.type==='-'){const op=token.type;next();left={op,left,right:term()};}return left;}
    next();const tree=expression();if(token.type!=='end')throw Error('Falta un operador. Escribe 2*X y separa argumentos con ;.');
    return context => {
      const vars=Object.fromEntries(Object.entries(context).map(([k,v])=>[k.toUpperCase(),v]));
      function evalNode(n){let result;
        if('number'in n)result=n.number;
        else if(n.variable){if(n.variable==='PI')result=Math.PI;else if(Object.hasOwn(vars,n.variable))result=vars[n.variable];else throw Error(`Variable ${n.variable} no disponible. Revisa las variables indicadas junto a la fórmula.`);}
        else if(n.name)result=functions[n.name][1](...n.args.map(evalNode));
        else if(n.op==='neg')result=n.sign*evalNode(n.right);
        else{const a=evalNode(n.left),b=evalNode(n.right);if(n.op==='/'&&b===0)throw Error('División por cero. Revisa el denominador.');result=n.op==='+'?a+b:n.op==='-'?a-b:n.op==='*'?a*b:n.op==='/'?a/b:Math.pow(a,b);}
        if(!Number.isFinite(result))throw Error('La fórmula no produce un número finito. Revisa raíces, logaritmos y potencias.');return result;
      }
      return evalNode(tree);
    };
  }
  return {compile};
})();
if(typeof module!=='undefined')module.exports=CuantitativasFormulas;
