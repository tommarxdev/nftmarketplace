import React from 'react'
import Image from 'next/image'
import Style from "./Loader.module.css"
import images from "../../img"

const Loader = () => {
  return (
    <div className={Style.Loader}>
        <div className={Style.Loader_box}>
            <div className={Style.Loader_box_img}>
                <Image
                src={images.loader}
                alt="Loader"
                width={200}
                height={200}
                className={Style.Loder_box_img_img}
                objectFit="cover"
                 />
            </div>
        </div>
    </div>
  )
}

export default Loader