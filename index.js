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
    //
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
   *  @return {object}
   */
  require = (moduleName, source) => {
    //
    if (this.$cacheMoudle.has(moduleName)) {
      //
      return this.$cacheMoudle.get(moduleName).exports
    }

    //
    const module = new Moudle(moduleName, source)
    //
    const exports = this.compile(module, source)

    //
    this.$cacheMoudle.set(moduleName, module)
    return exports
  }

  /**
   *
   *
   *
   */

  $wrap = (code) => {
    //
    const wrapper = [
      'return (function (module, exports, require) {',
      '\n});'
    ]
    return wrapper[0] + code + wrapper[1]
  }

  /**
   *
   *
   */
  $runInThisContext = (code, whiteList=['console']) => {
    //
    const func = new Function('sandbox', `with(sandbox) {${code}}`)
    return function(sandbox) {
      if (!sandbox || typeof sandbox !== 'object') {
        throw Error('sandbox parameter must be an object')
      }
      //
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
   *
   *
   */
  compile = (module, source) => {
    //
    const compiler = this.$runInThisContext(this.$wrap(source))({})
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
