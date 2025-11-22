import React from 'react'
import LoaderImg from '../images/loading.gif'

const Loader = () => {
  return (
    <div className="loader">
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }} className="loader__image">
            <img style={{ width: '4rem' }} src={LoaderImg} />
        </div>
    </div>
  )
}

export default Loader