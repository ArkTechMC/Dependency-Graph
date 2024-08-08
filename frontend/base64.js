export const getBase64 = imgUrl => new Promise((resolve, reject) => {
    fetch(imgUrl, {
        responseType: 'blob'
    }).catch(reject).then(response => response.blob()).then(blob => {
        let oFileReader = new FileReader()
        oFileReader.onloadend = function (e) {
            resolve(e.target.result)
        }
        oFileReader.readAsDataURL(blob)
    })
})