const express = require("express")
const path = require("path")
const app = express()

app.listen(3000 , ()=> {
    console.log('port connected');
})