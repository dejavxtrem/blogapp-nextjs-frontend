import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { API, Storage } from "aws-amplify";
import dynamic from "next/dynamic";
const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
	ssr: false,
});
import "easymde/dist/easymde.min.css";
import { updatePost } from "../../src/graphql/mutations";
import { getPost } from "../../src/graphql/queries";
import { v4 as uuid } from "uuid";

const EditPost = () => {
	const [post, setPost] = useState(null);
	const [coverImage, setCoverImage] = useState(null);
	const [localImage, setLocalImage] = useState(null);

	const fileInput = useRef(null);
	const router = useRouter();
	const { id } = router.query;

	// get coverImage from storage
	const updatedCoverImage = async (coverImage) => {
		try {
			const imageKey = await Storage.get(coverImage);
			setCoverImage(imageKey);
		} catch (error) {
			console.log(error);
		}
	};

	useEffect(() => {
		fetchPost();
		async function fetchPost() {
			try {
				if (!id) return;
				const postData = await API.graphql({
					query: getPost,
					variables: { id },
				});

				if (postData.data.getPost.coverImage) {
					updatedCoverImage(postData.data.getPost.coverImage);
				}

				//	console.log(postData);
				setPost(postData.data.getPost);
			} catch (error) {
				console.log(error);
			}
		}
	}, [id]);

	if (!post) return null;

	//get the currrent click
	async function uploadImage() {
		fileInput.current.click();
	}

	// handle file upload  change
	const handleChange = (e) => {
		const fileUpload = e.target.files[0];
		console.log(fileUpload);
		if (!fileUpload) return;
		setCoverImage(fileUpload);
		setLocalImage(URL.createObjectURL(fileUpload));
	};

	// onChange function
	const onChange = (e) => {
		setPost(() => ({ ...post, [e.target.name]: e.target.value }));
	};

	// distructure
	const { title, content } = post;

	//console.log(coverImage);

	const updateCurrentPost = async () => {
		try {
			if (!title | !content) return;

			const postUpdated = {
				id,
				title,
				content,
			};

			//store the  new picture in s3 bucket
			if (coverImage && localImage) {
				const fileName = `${coverImage.name}_${uuid()}`;
				postUpdated.coverImage = fileName;
				await Storage.put(fileName, coverImage);
			}

			await API.graphql({
				query: updatePost,
				variables: { input: postUpdated },
				authMode: "AMAZON_COGNITO_USER_POOLS",
			});
			router.push("/my-posts");
		} catch (error) {
			console.log(error[0].message);
		}
	};

	return (
		<div>
			<h1 className="text-3xl font-semibold tracking-wide mt-6 mb-2">
				Edit post
			</h1>
			{coverImage && (
				<img
					width={800}
					height={500}
					className="mt-4"
					src={localImage ? localImage : coverImage}
				/>
			)}
			<input
				onChange={onChange}
				name="title"
				placeholder="Title"
				value={post.title}
				className="border-b pb-2 text-lg my-4 focus:outline-none w-full font-light text-gray-500 placeholder-gray-500 y-2"
			/>
			<SimpleMDE
				value={post.content}
				onChange={(value) => setPost({ ...post, content: value })}
			/>
			<input
				type="file"
				ref={fileInput}
				className="absolute w-0 h-0"
				onChange={handleChange}
			/>
			<button
				className="mb-4 bg-purple-600 text-white font-semibold px-8 py-2 rounded-lg"
				onClick={uploadImage}
			>
				Upload Cover Image
			</button>{" "}
			<button
				className="mb-4 bg-blue-600 text-white font-semibold px-8 py-2 rounded-lg"
				onClick={updateCurrentPost}
			>
				Update Post
			</button>
		</div>
	);
};

export default EditPost;
