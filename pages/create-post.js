import { withAuthenticator } from "@aws-amplify/ui-react";
import { React, useRef, useState } from "react";
import { API, Storage } from "aws-amplify";
import { v4 as uuid } from "uuid";
import { createPost } from "../src/graphql/mutations";
import { useRouter } from "next/router";
import Image from "next/image";
import dynamic from "next/dynamic";

//simple react editor
const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
	ssr: false,
});

import "easymde/dist/easymde.min.css";

const initialState = { title: "", content: "", id: "" };

const CreatePost = () => {
	const [post, setPost] = useState(initialState);
	const [image, setImage] = useState(null);
	const imageFileInput = useRef(null); // use ref to target image

	const { title, content, id } = post;

	const router = useRouter();

	const onChange = (e) => {
		setPost(() => ({
			...post,
			[e.target.name]: e.target.value,
		}));
	};

	console.log(post.id);

	const createNewPost = async () => {
		if (!title || !content) return;
		const id = uuid();
		post.id = id;

		//storing the
		if (image) {
			const fileName = `${image.name}_${uuid()}`; // file name
			post.coverImage = fileName;
			// storing image in s3 bucket  in amplify
			await Storage.put(fileName, image);
		}

		await API.graphql({
			query: createPost,
			variables: { input: post },
			authMode: "AMAZON_COGNITO_USER_POOLS",
		});
		router.push(`/posts/${id}`);
	};

	//upload image function
	const uploadImage = async () => {
		try {
			imageFileInput.current.click();
		} catch (error) {
			console.log(error);
		}
	};

	// handle change function to grab image
	const handleChange = (e) => {
		const fileUploaded = e.target.files[0];
		if (!fileUploaded) return;
		setImage(fileUploaded);
	};

	return (
		<div>
			<h1
				className="text-3xl font-semibold tracking-wide
      mt-6"
			>
				Create New Post
			</h1>
			<input
				onChange={onChange}
				name="title"
				placeholder="Title"
				value={post.title}
				className="border-b pb-2 text-lg my-4
         focus:outline-none w-full font-light text-gray-500 placeholder-gray-500 y-2"
			/>
			{/* // eslint-disable-next-line @next/next/no-img-element */}
			{image && (
				<Image
					src={URL.createObjectURL(image)}
					className="my-4"
					alt="Image"
					width={800}
					height={500}
				/>
			)}
			<SimpleMDE
				value={post.content}
				onChange={(value) => setPost({ ...post, content: value })}
			/>
			<input
				type="file"
				ref={imageFileInput}
				className="absolute w-0 h-0"
				onChange={handleChange}
			/>
			<button
				type="button"
				className="bg-green-600 text-white 
        font-semibold px-8 py-2 rounded-lg mr-2"
				onClick={uploadImage}
			>
				Upload Image
			</button>{" "}
			<button
				type="button"
				className="mb-4 bg-blue-600 text-white 
   font-semibold px-8 py-2 rounded-lg"
				onClick={createNewPost}
			>
				Create Post
			</button>{" "}
		</div>
	);
};

export default withAuthenticator(CreatePost);
