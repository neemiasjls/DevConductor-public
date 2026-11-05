import puppeteer from 'puppeteer-core'
import { pathToFileURL } from 'node:url'
const [arq, saida] = process.argv.slice(2)
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 800 })
await p.goto(pathToFileURL(arq).href); await new Promise((r) => setTimeout(r, 2500))
await p.click('input[value="2"]')
const info = await p.evaluate(() => ({ rodando: [...document.querySelectorAll('video')].map((v) => `${v.readyState}/${v.paused ? 'parado' : 'rodando'}`), rodape: document.getElementById('escolhidos').textContent }))
console.log(JSON.stringify(info)); await p.screenshot({ path: saida }); await b.close()
