# Wohnung App

Little JS project to grab files from google drive and compile into a PDF.

## Requirements

* PDFtk installed at CLI

## Usage

You'll need to create an application using Google APIs to get a `credentials.json`. Use https://developers.google.com/drive/api/v3/quickstart/nodejs

On first run, instructions on the terminal will create a `token.json` for subsequent uses of the API

Create a folder in Drive and set the contstant INDEX_FOLDER to its ID (visible in the URL when you browse this folder) e.g https://drive.google.com/drive/u/2/folders/1quPjq6yvbPtr6ropnlfAQbUoFg5f0Eug

then:

yarn
node index.js

Notes:
If the file is a PDF, it'll be downloaded raw.
If the file is a google doc, it'll be converted by the Drive API

The description field is used to 
```
Format for the description field:
order include watermark title
01    ja    links       A file that will be included, watermarked left
02    nein  rechts      A file that will not be included
03    ja    kein        A file that will be included, not watermarked
```
(note, watermark is not currently implemented :-))