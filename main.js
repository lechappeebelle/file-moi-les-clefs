//@ts-check

import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

import Fastify from 'fastify'
import got from 'got'

const server = Fastify()

const client_id = process.env.GITHUB_ID
const client_secret = process.env.GITHUB_SECRET

const whitelist = new Set(readFileSync('./whitelist.csv', {encoding: 'utf8'}).split('\n').map(s => s.trim()))

server.get('/gh-callback', (req, res) => {
  const {code, destination} = req.query

  if(!code){
    res.status(400)
      .send(`<h1>Erreur 400</h1><p>le paramètre <code>code<code> est manquant.</p>`)
    return;
  }
  if(!destination){
    res.status(400)
      .send(`<h1>Erreur 400</h1><p>le paramètre <code>destination<code> est manquant.</p>`)
    return;
  }

  const redirectUrl = new URL(destination)
  const hostname = redirectUrl.hostname 

  if(!hostname || whitelist.has(hostname)){
    res.status(403)
      .send(`<h1>Erreur 403</h1><p>Vous avez demandé : ${destination}, et ${hostname} n'est pas présent dans notre <a href="https://github.com/daktary-team/file-moi-les-clefs/blob/master/whitelist.csv">liste d'invité</a>.</p>`)
    return;
  }
  
  const urlGhOAuth =
    `https://github.com/login/oauth/access_token?code=${code}&client_id=${client_id}&client_secret=${client_secret}`

  got.post(urlGhOAuth, { json: true }).then(ghResponse => {
    const access_token = ghResponse.body.access_token
    redirectUrl.searchParams.set(`access_token`, access_token)
    res.redirect(302, redirectUrl.toString())
  })
})

server.get('/receive-token', (req, res) => {
  res.sendFile(resolve(__dirname, './example_access_token.html'))
})

server.get('/\*' , (req, res) => {
  res.send(`<!doctype html>
    <html lang=en>
        <head>
            <meta charset=utf-8>
            <meta name="referrer" content="same-origin">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            
            <title></title>
            
            <meta name="description" content=" ">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            
            <link rel="stylesheet" href="https://rawgit.com/twbs/bootstrap/v4-dev/dist/css/bootstrap-reboot.css">
            
            <script crossorigin="anonymous" src="https://cdn.polyfill.io/v2/polyfill.min.js"></script>
        </head>
        <body>
          <a href="https://github.com/login/oauth/authorize?client_id=${client_id}&scope=public_repo">Login with Github</button>
        </body>
    </html>
  `)
})

// @ts-ignore
server.listen({ port: process.env.PORT || 5000 }, (err, address) => {
    console.log(`Server is listening on ${address}  `)
}) 

process.on('uncaughtException', e => console.error('uncaughtException', e))
process.on('unhandledRejection', e => console.error('unhandledRejection', e))
