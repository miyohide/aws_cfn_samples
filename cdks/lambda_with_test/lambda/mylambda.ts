exports.handler = async (event) => {
  const message = event['message'] || 'Hello'
  const time = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  const response = {
    "statusCode": 200,
    "body": JSON.stringify({
      message: message,
      time: time
    })
  }
  return response
};
