/**
 * 实现一个简单的 commonjs 模块加载器，偏浏览器端实现
 *
 * 指导准则： COMMONJS 规范
 *
 * 1、模块加载器：解析文件地址，有一个寻找规则，目的是找到文件
 * 2、模块解析器： 执行文件内容的，Node 里面是使用 v8 执行的
 */

class Moudle {
  constructor(moduleName, source) {
    // 暴露数据
    this.exports = {}
    // 保存模块的信息
    this.moduleName = moduleName
    // 缓存
    this.$cacheMoudle = new Map()
    // 源代码（可执行的代码）
    this.$source = source
  }
  /**
   *  require
   *
   *  usage: require('./a.js')
   *
   *  @param {string} moduleName 模块的名称
   *  @param {string} source 文件的源码
   *
   *  @return {object} require返回的结果就是 exports 的引用
   */
  require = (moduleName, source) => {
    // 每次 require 都执行文件的内容，开销比较大，加上缓存机制减少开销
    if (this.$cacheMoudle.has(moduleName)) {
      // 注意，返回的是 exports
      return this.$cacheMoudle.get(moduleName).exports
    }

    // 创建模块
    const module = new Moudle(moduleName, source)
    // 执行文件的内容
    const exports = this.compile(module, source)

    // 放进缓存
    this.$cacheMoudle.set(moduleName, module)
    return exports
  }

  /**
   * 拼一个闭包 IIFE
   * @param {string} code 代码字符串
   */

  $wrap = (code) => {
    const wrapper = [
      'return (function (module, exports, require) {',
      '\n});'
    ]
    return wrapper[0] + code + wrapper[1]
  }

  /**
   * 简单实现一个能在浏览器跑的解释器 vm.runInThisContext
   * 核心是要创建一个隔离的沙箱环境，来执行代码字符串
   *
   * 隔离： 1、不能访问闭包的变量；2、不能访问全局的变量；3、只能访问传入的变量
   *
   * eval: 可以访问全局/闭包，但是需要解释执行，ES5后 如果是间接使用eval -> (0, eval)('val a = b + 1')  ========> 不可行 ×
   * new Function: 不可以访问闭包，可以访问全局，只编译一次 （对应第1点）
   * with: with 包裹的对象，会被放到原型链的顶部，而且底层是通过 in 操作符判断的
   *       如果通过 with 塞入传入的参数 （对应第2点）
   *       不管是什么属性，都从塞入的对象取值，取不到就返回 undefined ，这样就不会访问全局的域了 （对应第3点）
   *
   * unscopable: 这个对象不能被 with 处理
   *
   * @param {string} code 代码字符串
   */
  $runInThisContext = (code, whiteList=['console']) => {
    // 使用 with 可以保证通过传入的 sandbox 对象取数据
    // new Function 不可以访问闭包
    const func = new Function('sandbox', `with(sandbox) {${code}}`)
    return function(sandbox) { // 塞到文件源代码中的变量
      if (!sandbox || typeof sandbox !== 'object') {
        throw Error('sandbox parameter must be an object')
      }
      // 代理
      const proxyObject = new Proxy(sandbox, {
        // 专门处理 in 操作符
        has(target, key) {
          if (!whiteList.includes(key)) {
            return true
          }
        },
        get(target, key, receiver) {
          if (key === Symbol.unscopables) {
            return void 0
          }
          return Reflect.get(target, key, receiver)
        }
      });

      return func(proxyObject)
    }
  }

  /**
   * 执行文件内容，入参是文件源代码字符串
   *
   * IIFE： (function(){}(x,y))
   *
   * function(proxySandBox) {
   *   with(proxySandBox) {
   *     return (function (module, exports, require) {
   *       // 文件内容字符串
   *     })
   *   }
   * }
   *
   */
  compile = (module, source) => {
    // return (function (module, exports, require) { // xxx });
    const iifeString = this.$wrap(source)
    // 创建沙箱的执行环境
    const compiler = this.$runInThisContext(iifeString)({})
    compiler.call(module, module, module.exports, this.require)

    return module.exports
  }
}


// test
const mm = new Moudle()

const sourceCodeFromAMoudle = `
  const b = require('b.js', 'exports.action = function() { console.log("execute action from B module")}');
  b.action();
`
const sourceCodeAMoudle = `
  const b = require('b.js','const a = require("a.js");console.log("a module:", a);exports.action = function() { console.log("execute action from B module")}');
    b.action();
  
    exports.action = function() {
    console.log("execute action from A module!")
  }
`
mm.require('a.js', sourceCodeFromAMoudle)
// mm.require('a.js', sourceCodeAMoudle)
