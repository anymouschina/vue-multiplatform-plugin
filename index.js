/**
 * 此插件用作统一接口的多端文件
 * 引入的js，ts，tsx，jsx 可以根据不同后缀区分引入
 * 插件取自taro commitId f5f61e3b4cc52365178ccea25a58957194fb8852
 * https://github.com/NervJS/taro/blob/f5f61e3b4cc52365178ccea25a58957194fb8852/packages/taro-runner-utils/src/resolve/MultiPlatformPlugin.ts
 */
const path = require('path')
const fs = require('fs')

function resolveMainFilePath(p, extArrs = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
]) {
  const realPath = p
  const uniEnv = process.env.UNI_PLATFORM

  for (let i = 0; i < extArrs.length; i++) {
    const item = extArrs[i]

    if (uniEnv) {
      if (fs.existsSync(`${p}.${uniEnv}${item}`)) {
        return `${p}.${uniEnv}${item}`
      }

      if (fs.existsSync(`${p}${path.sep}index.${uniEnv}${item}`)) {
        return `${p}${path.sep}index.${uniEnv}${item}`
      }

      if (fs.existsSync(`${p.replace(/\/index$/, `.${uniEnv}/index`)}${item}`)) {
        return `${p.replace(/\/index$/, `.${uniEnv}/index`)}${item}`
      }
    }

    if (fs.existsSync(`${p}${item}`)) {
      return `${p}${item}`
    }

    if (fs.existsSync(`${p}${path.sep}index${item}`)) {
      return `${p}${path.sep}index${item}`
    }
  }

  return realPath
}

// interface IOptions {
//   include?[]
// }

/**
 * @description 此 enhance-resolve 插件用于根据当前编译的平台，解析多端文件的后缀
 *
 * @property {string} source resolver hook 类别
 * @property {string} target 解析完成后需要触发的钩子
 * @property {IOptions} options 插件配置项
 *
 * @example
 *   there's filepath 'src/index'
 *   when platform is weapp, we get 'src/index.weapp.[js|ts|jsx|tsx]'
 *   when platform is h5, we get 'src/index.h5.[js|ts|jsx|tsx]'
 *   by default, we get 'src/index.[js|ts|jsx|tsx]'
 *
 * @class MultiPlatformPlugin
 */
exports.MultiPlatformPlugin = class MultiPlatformPlugin {
  constructor(source, target, options) {
    this.source = source
    this.target = target
    this.options = options || {}
  }

  apply(resolver) {
    const target = resolver.ensureHook(this.target)
    resolver
      .getHook(this.source)
      .tapAsync('MultiPlatformPlugin', (request, resolveContext, callback) => {
        const innerRequest = request.request || request.path

        if (!innerRequest) { return callback() }

        if (!path.extname(innerRequest)) {
          let srcRequest

          if (path.isAbsolute(innerRequest)) {
            // absolute path
            srcRequest = innerRequest
          } else if (!path.isAbsolute(innerRequest) && /^\./.test(innerRequest)) {
            // relative path
            srcRequest = path.resolve(request.path, request.request)
          } else {
            return callback()
          }

          if (/node_modules/.test(srcRequest) && !this.includes(srcRequest)) {
            return callback()
          }

          const newRequestStr = resolveMainFilePath(srcRequest)

          if (newRequestStr === innerRequest) { return callback() }

          const obj = { ...request, request: newRequestStr }

          return resolver.doResolve(target, obj, 'resolve multi platform file path', resolveContext, (err, result) => {
            if (err) { return callback(err) }

            if (result === undefined) { return callback(null, null) }

            return callback(null, result)
          })
        }

        callback()
      })
  }

  includes(filePath) {
    if (!this.options.include || !this.options.include.length) { return false }

    filePath = filePath.replace(path.sep, '/')

    const res = this.options.include.find((item) => { return filePath.includes(item) })

    return Boolean(res)
  }
}
